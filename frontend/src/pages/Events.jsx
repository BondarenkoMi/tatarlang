import {useEffect, useState} from 'react';
import EventCard from "../components/EventCard/EventCard";
import './Events.css';
import {useAuth} from "../contexts/AuthContext";

const Events = () => {
    const { access } = useAuth();
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {

                console.log('Текущий токен:', access);

                const response = await fetch('https://tataredu.test/api/v1/events/', {
                    headers: {
                        'Authorization': `Bearer ${access}`,
                    },
                });
                if (!response.ok) {
                    throw new Error(`Ошибка сети: ${response.status}`);
                }
                console.log('Response:', response);
                const data = await response.json();
                if (Array.isArray(data)) {
                    setEvents(data);
                } else if (Array.isArray(data.results)) {
                    setEvents(data.results);
                } else {
                    throw new Error("Неверный формат данных");
                }
            } catch (err) {
                console.error("Ошибка загрузки событий:", err);
            }
        };
        fetchEvents();
    }, []);



    return (
        <div className='ivents-page'>
            <h1 className='ivents-title'>Мероприятия</h1>
            <section className='ivent-section'>
                {events.map((event) => (
                    <EventCard
                        key={event.id}
                        title={event.title}
                        place={event.venue}
                        event_type={event.event_type}
                        date={event.date.split('T')[0]}
                        time={event.date.split('T')[1].slice(0, 5)}
                        image={event['image_url']}
                        url={event['source_url']}
                    />
                ))}

            </section>
        </div>
    );
};

export default Events;