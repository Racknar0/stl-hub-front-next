'use client';
import React, { useState, useEffect } from 'react';
import useStore from '../../../store/useStore';
import './SocialProofPopup.scss';

// Diverse, global fake names (100+)
const FAKE_NAMES = [
    'Alex M.',
    'María C.',
    'Wei L.',
    'Ahmed S.',
    'Yuki T.',
    'Emma B.',
    'Lucas R.',
    'Priya K.',
    'Lars N.',
    'Giulia F.',
    'Dimitri I.',
    'Fatou D.',
    'Min-jun P.',
    'Diego V.',
    'Sarah H.',
    'Hiroshi O.',
    'Elena K.',
    'Mateo G.',
    'Chloe W.',
    'Ravi P.',
    'Carlos T.',
    'Sophia R.',
    'Daniel M.',
    'Isabella S.',
    'David L.',
    'Mia V.',
    'James C.',
    'Charlotte P.',
    'Juan D.',
    'Amelia F.',
    'Miguel A.',
    'Harper B.',
    'Jose R.',
    'Evelyn M.',
    'Luis G.',
    'Abigail S.',
    'Gabriel M.',
    'Emily W.',
    'Antonio L.',
    'Elizabeth J.',
    'Alejandro G.',
    'Sofia C.',
    'Francisco M.',
    'Avery T.',
    'Manuel R.',
    'Ella H.',
    'Javier S.',
    'Madison D.',
    'Tomás P.',
    'Scarlett L.',
    'Andrés V.',
    'Victoria C.',
    'Fernando J.',
    'Aria B.',
    'Sebastián M.',
    'Grace S.',
    'Jorge D.',
    'Lily P.',
    'Nicolás L.',
    'Hannah T.',
    'Pedro G.',
    'Aubrey R.',
    'Ricardo S.',
    'Zoey M.',
    'Roberto C.',
    'Penelope W.',
    'Martín P.',
    'Lillian G.',
    'Eduardo M.',
    'Addison C.',
    'Joaquín V.',
    'Layla S.',
    'Santiago J.',
    'Natalie F.',
    'Emilio G.',
    'Camila P.',
    'Felipe M.',
    'Brooklyn H.',
    'Hugo C.',
    'Zoe L.',
    'Iván S.',
    'Audrey M.',
    'Simón R.',
    'Claire D.',
    'Thiago M.',
    'Eleanor T.',
    'Valentino V.',
    'Skylar P.',
    'Bautista G.',
    'Lucy C.',
    'Kevin H.',
    'Olivia N.',
    'Noah W.',
    'Ethan F.',
    'Liam D.',
    'Mason Y.',
    'Logan P.',
    'Oliver S.',
    'Jacob K.',
    'Elijah M.',
    'Oliver B.',
    'Jack D.',
    'Harry T.',
    'Jacob W.',
    'Charlie M.',
    'Thomas C.',
    'George P.',
    'Oscar L.',
    'James H.',
    'William S.',
    'Amir K.',
    'Hassan A.',
    'Tariq M.',
    'Zayn F.',
    'Omar S.',
    'Ali Y.',
    'Ibrahim M.',
    'Yusuf K.',
    'Mustafa A.',
    'Mahmoud S.',
];

const COUNTRIES_ES = [
    'Estados Unidos',
    'España',
    'Japón',
    'Brasil',
    'Reino Unido',
    'Alemania',
    'India',
    'Italia',
    'Francia',
    'Canadá',
    'México',
    'Australia',
    'Corea del Sur',
    'Argentina',
    'Chile',
    'Colombia',
    'Perú',
    'Países Bajos',
    'Suecia',
    'Suiza',
    'Polonia',
    'Portugal',
    'Bélgica',
    'Austria',
    'Dinamarca',
    'Noruega',
    'Finlandia',
    'Nueva Zelanda',
    'Irlanda',
    'Singapur',
    'Emiratos Árabes',
    'Sudáfrica',
    'Uruguay',
    'Costa Rica',
    'Ecuador',
    'República Checa',
    'Grecia',
    'Turquía',
    'Israel',
    'Malasia',
];

const COUNTRIES_EN = [
    'the USA',
    'Spain',
    'Japan',
    'Brazil',
    'the UK',
    'Germany',
    'India',
    'Italy',
    'France',
    'Canada',
    'Mexico',
    'Australia',
    'South Korea',
    'Argentina',
    'Chile',
    'Colombia',
    'Peru',
    'the Netherlands',
    'Sweden',
    'Switzerland',
    'Poland',
    'Portugal',
    'Belgium',
    'Austria',
    'Denmark',
    'Norway',
    'Finland',
    'New Zealand',
    'Ireland',
    'Singapore',
    'the UAE',
    'South Africa',
    'Uruguay',
    'Costa Rica',
    'Ecuador',
    'the Czech Republic',
    'Greece',
    'Turkey',
    'Israel',
    'Malaysia',
];

const PLANS = ['30', '90', '180', '365'];

const getRandomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomItem = (arr) => arr[getRandomInt(0, arr.length - 1)];

const SocialProofPopup = () => {
    const [visible, setVisible] = useState(false);
    const [data, setData] = useState(null);

    const language = useStore((s) => s.language);
    const isEn = String(language || 'es').toLowerCase() === 'en';

    const generateData = () => {
        const name = getRandomItem(FAKE_NAMES);
        const countryIdx = getRandomInt(0, COUNTRIES_ES.length - 1);
        const country = isEn
            ? COUNTRIES_EN[countryIdx]
            : COUNTRIES_ES[countryIdx];
        const plan = getRandomItem(PLANS);
        const minutes = getRandomInt(2, 59);

        setData({ name, country, plan, minutes });
    };

    useEffect(() => {
        // Initial delay before showing the first popup
        const initialTimer = setTimeout(() => {
            generateData();
            setVisible(true);
        }, 5000); // Show after 5 seconds

        return () => clearTimeout(initialTimer);
    }, [isEn]);

    useEffect(() => {
        if (!visible) return;

        // Hide after 6 seconds
        const hideTimer = setTimeout(() => {
            setVisible(false);

            // Schedule the next one after hiding
            const nextDelay = getRandomInt(45000, 120000); // Between 45s and 120s
            setTimeout(() => {
                generateData();
                setVisible(true);
            }, nextDelay);
        }, 6000);

        return () => clearTimeout(hideTimer);
    }, [visible]);

    if (!data) return null;

    return (
        <div className={`social-proof-popup ${visible ? 'show' : ''}`}>
            <div className="proof-icon">⭐</div>
            <div className="proof-content">
                <p className="proof-title">
                    <strong>{data.name}</strong>
                    <span className="proof-country">
                        {isEn ? ` from ${data.country}` : ` de ${data.country}`}
                    </span>
                </p>
                <p className="proof-action">
                    {isEn ? 'just bought the ' : 'acaba de comprar el '}
                    <strong>
                        {data.plan} {isEn ? 'days plan' : 'días'}
                    </strong>
                </p>
                <p className="proof-time">
                    {isEn
                        ? `${data.minutes} minutes ago`
                        : `Hace ${data.minutes} minutos`}
                </p>
            </div>
        </div>
    );
};

export default SocialProofPopup;
