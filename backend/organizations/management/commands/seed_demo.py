from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from events.tasks import update_events_task
from exams.models import Choice, Exam, Question
from organizations.models import Course, Organization


COURSES = [
    ("Татарский с нуля", "Алфавит, произношение и основные фразы для повседневного общения.", 1, 0, 60),
    ("Разговорный татарский", "Практика диалогов для дома, учёбы, путешествий и общения с друзьями.", 2, 14, 90),
    ("Татарская грамматика", "Падежи, времена глаголов и построение сложных предложений.", 3, 30, 120),
    ("Литература и культура Татарстана", "Чтение произведений татарских авторов и знакомство с традициями.", 4, 45, 150),
    ("Деловой татарский", "Официальная переписка, переговоры и профессиональная лексика.", 5, 60, 180),
]


EXAMS = [
    {
        "title": "Татарский язык — уровень A1",
        "description": "Базовые слова, приветствия и простые выражения.",
        "level": 1,
        "questions": [
            ("Как по-татарски сказать «Здравствуйте»?", ["Исәнмесез", "Сау булыгыз", "Рәхмәт", "Зинһар"], 0),
            ("Что означает слово «рәхмәт»?", ["Пожалуйста", "Спасибо", "Доброе утро", "До свидания"], 1),
            ("Как переводится «әйе»?", ["Нет", "Возможно", "Да", "Сегодня"], 2),
            ("Выберите татарское слово для числа один.", ["ике", "өч", "бер", "дүрт"], 2),
            ("Как спросить «Как дела?»?", ["Хәлләр ничек?", "Исемең ничек?", "Кайда яшисең?", "Сәгать ничә?"], 0),
        ],
    },
    {
        "title": "Повседневное общение — уровень A2",
        "description": "Проверка словарного запаса для обычных жизненных ситуаций.",
        "level": 2,
        "questions": [
            ("Что означает «Мин Казанда яшим»?", ["Я еду в Казань", "Я живу в Казани", "Я люблю Казань", "Я родился в Казани"], 1),
            ("Как по-татарски «семья»?", ["гаилә", "мәктәп", "эш", "шәһәр"], 0),
            ("Выберите перевод слова «бүген».", ["Завтра", "Вчера", "Сегодня", "Неделя"], 2),
            ("Как попросить чай?", ["Чәй бирегезче", "Ишекне ачыгыз", "Китап укыгыз", "Монда килегез"], 0),
            ("Что означает «Сау булыгыз»?", ["Добро пожаловать", "До свидания", "Извините", "Приятного аппетита"], 1),
        ],
    },
    {
        "title": "Грамматика — уровень B1",
        "description": "Падежи, глаголы и структура татарского предложения.",
        "level": 3,
        "questions": [
            ("Какое окончание обозначает местно-временной падеж?", ["-ны/-не", "-да/-дә", "-га/-гә", "-дан/-дән"], 1),
            ("Выберите форму прошедшего времени глагола «бару».", ["бара", "барыр", "барды", "барсын"], 2),
            ("Где обычно стоит сказуемое в татарском предложении?", ["В начале", "После подлежащего", "В конце", "Положение не имеет значения"], 2),
            ("Какой вопрос соответствует дательному падежу?", ["кемне?", "кемгә?", "кемдә?", "кемнән?"], 1),
            ("Выберите множественное число слова «китап».", ["китапны", "китапта", "китаплар", "китапка"], 2),
        ],
    },
    {
        "title": "Культура и литература — уровень B2",
        "description": "Татарские писатели, произведения и национальные традиции.",
        "level": 4,
        "questions": [
            ("Кто написал поэму «Шүрәле»?", ["Муса Җәлил", "Габдулла Тукай", "Әмирхан Еники", "Фатих Әмирхан"], 1),
            ("Как называется татарский национальный праздник окончания весенних полевых работ?", ["Нәүрүз", "Сабантуй", "Карга боткасы", "Сөмбелә"], 1),
            ("Что такое түбәтәй?", ["Музыкальный инструмент", "Головной убор", "Блюдо", "Танец"], 1),
            ("Как называется татарский треугольный пирожок?", ["чәк-чәк", "кыстыбый", "өчпочмак", "бәлеш"], 2),
            ("Муса Җәлил известен прежде всего как…", ["поэт", "архитектор", "композитор", "художник"], 0),
        ],
    },
    {
        "title": "Продвинутый татарский — уровень C1",
        "description": "Сложная лексика, устойчивые выражения и стилистика.",
        "level": 5,
        "questions": [
            ("Как переводится выражение «тел ачкычы»?", ["ключ от дома", "начало речи", "учебник", "словарь"], 1),
            ("Выберите наиболее близкий перевод слова «мирас».", ["наследие", "будущее", "ремесло", "воспоминание"], 0),
            ("Что означает «уртак тел табу»?", ["перевести текст", "найти общий язык", "забыть слово", "говорить громко"], 1),
            ("Выберите синоним слова «гүзәл».", ["матур", "озын", "авыр", "салкын"], 0),
            ("Какой стиль используется в официальном заявлении?", ["сөйләм стиле", "рәсми стиль", "матур әдәбият стиле", "публицистик стиль"], 1),
        ],
    },
]


class Command(BaseCommand):
    help = "Создаёт демонстрационные организацию, курсы и тесты"

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-events",
            action="store_true",
            help="После наполнения БД обновить мероприятия через парсер Яндекс Афиши",
        )

    @transaction.atomic
    def _seed_content(self):
        User = get_user_model()
        owner, created = User.objects.get_or_create(
            email="demo-organization@tataredu.local",
            defaults={
                "role": "organization",
                "first_name": "Демонстрационная",
                "last_name": "Организация",
                "is_active": True,
            },
        )
        if created:
            owner.set_unusable_password()
            owner.save(update_fields=["password"])

        organization, _ = Organization.objects.update_or_create(
            name="Образовательный центр TatarEdu",
            defaults={
                "owner": owner,
                "description": "Демонстрационные курсы татарского языка и культуры.",
                "addres": {"city": "Казань", "street": "Кремлёвская", "house": "18"},
            },
        )

        today = timezone.localdate()
        for name, description, level, start_offset, duration in COURSES:
            Course.objects.update_or_create(
                organization=organization,
                name=name,
                defaults={
                    "description": description,
                    "level": level,
                    "start_date": today + timedelta(days=start_offset),
                    "end_date": today + timedelta(days=start_offset + duration),
                },
            )

        for exam_data in EXAMS:
            exam, _ = Exam.objects.update_or_create(
                author=organization,
                title=exam_data["title"],
                defaults={
                    "description": exam_data["description"],
                    "level": exam_data["level"],
                },
            )
            exam.questions.all().delete()
            for number, (text, choices, correct_index) in enumerate(exam_data["questions"], start=1):
                question = Question.objects.create(
                    exam=exam,
                    text=text,
                    number=number,
                    point=2,
                )
                Choice.objects.bulk_create([
                    Choice(question=question, text=choice, is_correct=index == correct_index)
                    for index, choice in enumerate(choices)
                ])

        return organization

    def handle(self, *args, **options):
        organization = self._seed_content()
        self.stdout.write(self.style.SUCCESS(
            f"Созданы данные: организация «{organization.name}», "
            f"курсов — {len(COURSES)}, тестов — {len(EXAMS)}."
        ))

        if options["with_events"]:
            self.stdout.write("Запускаю парсер мероприятий…")
            try:
                result = update_events_task.run()
            except Exception as exc:
                raise CommandError(
                    f"Курсы и тесты созданы, но парсер мероприятий завершился ошибкой: {exc}"
                ) from exc
            self.stdout.write(self.style.SUCCESS(
                "Мероприятия обновлены: "
                f"создано {result['created']}, обновлено {result['updated']}, "
                f"удалено прошедших {result['deleted_old']}."
            ))
