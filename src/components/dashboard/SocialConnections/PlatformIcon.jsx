// Icono de cada red social (marca oficial simplificada), usado en Publicaciones
export default function PlatformIcon({ platform, size = 16, title }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', className: `rl-icon rl-icon-${platform}`, role: 'img', 'aria-label': title || platform };
  if (platform === 'instagram') {
    return (
      <svg {...common}>
        <defs>
          <radialGradient id="rl-ig-grad" cx="0.3" cy="1.07" r="1.2">
            <stop offset="0" stopColor="#fdf497" />
            <stop offset="0.1" stopColor="#fdf497" />
            <stop offset="0.5" stopColor="#fd5949" />
            <stop offset="0.68" stopColor="#d6249f" />
            <stop offset="1" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        {title && <title>{title}</title>}
        <rect x="1" y="1" width="22" height="22" rx="6.5" fill="url(#rl-ig-grad)" />
        <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="16.3" cy="7.7" r="1.05" fill="#fff" />
      </svg>
    );
  }
  if (platform === 'facebook') {
    return (
      <svg {...common}>
        {title && <title>{title}</title>}
        <circle cx="12" cy="12" r="11" fill="#1877F2" />
        <path fill="#fff" d="M13.4 23v-8.1h2.7l.4-3.2h-3.1V9.7c0-.9.3-1.6 1.6-1.6h1.7V5.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.4H7.6v3.2h2.7V23z" />
      </svg>
    );
  }
  if (platform === 'pinterest') {
    return (
      <svg {...common}>
        {title && <title>{title}</title>}
        <circle cx="12" cy="12" r="11" fill="#E60023" />
        <path fill="#fff" d="M12.3 5.2c-3.9 0-5.9 2.8-5.9 5.1 0 1.4.5 2.6 1.6 3.1.2.1.4 0 .4-.2l.2-.6c.1-.2 0-.3-.1-.5-.3-.4-.5-.9-.5-1.6 0-2.1 1.6-3.9 4.1-3.9 2.2 0 3.5 1.4 3.5 3.2 0 2.4-1.1 4.5-2.7 4.5-.9 0-1.5-.7-1.3-1.6.2-1.1.7-2.2.7-2.9 0-.7-.4-1.2-1.1-1.2-.9 0-1.6.9-1.6 2.2 0 .8.3 1.3.3 1.3l-1.1 4.6c-.3 1.3 0 3 0 3.1 0 .1.1.1.2 0 .1-.1 1-1.3 1.3-2.4l.5-2c.3.5 1 .9 1.8.9 2.4 0 4-2.2 4-5.1 0-2.2-1.9-4.3-4.7-4.3z" />
      </svg>
    );
  }
  if (platform === 'threads') {
    return (
      <svg {...common}>
        {title && <title>{title}</title>}
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#000" />
        <path fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round"
          d="M15.6 11.3c-.4-2.1-1.9-3.1-3.8-3.1-2.3 0-3.9 1.7-3.9 3.9 0 2.4 1.5 4.1 4 4.1 2.1 0 3.6-1.3 3.6-3.1 0-1.6-1.2-2.4-2.6-2.4-1.5 0-2.4.9-2.4 1.9 0 .9.7 1.5 1.6 1.5 1.6 0 2.4-1.3 2.4-3.3 0-2.9-1.8-4.8-4.6-4.8" />
      </svg>
    );
  }
  if (platform === 'bluesky') {
    return (
      <svg {...common}>
        {title && <title>{title}</title>}
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#1185FE" />
        <path fill="#fff" transform="translate(4 5.2) scale(0.0267)" d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" />
      </svg>
    );
  }
  if (platform === 'mastodon') {
    return (
      <svg {...common}>
        {title && <title>{title}</title>}
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#6364FF" />
        <path fill="#fff" transform="translate(2.4 2.6) scale(0.8)" d="M20.9 8.2c0-4-2.6-5.2-2.6-5.2C17 2.4 14.7 2.1 12.3 2.1h-.1c-2.4 0-4.7.3-6 .9 0 0-2.6 1.2-2.6 5.2v3c.1 3.9.7 7.7 4.3 8.7 1.6.4 3 .5 4.2.5 2.1-.1 3.3-.8 3.3-.8l-.1-1.5s-1.5.5-3.2.4c-1.7-.1-3.5-.2-3.8-2.3v-.6s1.7.4 3.8.5c1.3.1 2.5-.1 3.7-.2 2.4-.3 4.4-1.7 4.7-3 .4-2.1.4-5.1.4-5.1zm-3.2 5.3h-2V8.6c0-1-.4-1.6-1.3-1.6-1 0-1.5.6-1.5 1.9v2.7h-2V8.9c0-1.3-.5-1.9-1.5-1.9-.9 0-1.3.6-1.3 1.6v4.9h-2V8.4c0-1 .3-1.9.8-2.5.5-.6 1.3-.9 2.2-.9 1 0 1.8.4 2.3 1.2l.5.8.5-.8c.5-.8 1.3-1.2 2.3-1.2.9 0 1.7.3 2.2.9.5.6.8 1.5.8 2.5v5.1z" />
      </svg>
    );
  }
  if (platform === 'tumblr') {
    return (
      <svg {...common}>
        {title && <title>{title}</title>}
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#001935" />
        <path fill="#fff" d="M13.9 18.6c-2.1 0-3.6-1.1-3.6-3.6v-4.1H8.4V8.7c2.1-.5 3-2.3 3.1-3.9h2.2v3.6h2.6v2.5h-2.6v3.6c0 1.1.5 1.5 1.4 1.5h1.3v2.6h-2.5z" />
      </svg>
    );
  }
  if (platform === 'tiktok') {
    return (
      <svg {...common}>
        {title && <title>{title}</title>}
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#000" />
        <path fill="#25F4EE" d="M13.6 5.2h2.1c.2 1.6 1.2 2.8 2.9 3v2.2c-1.1 0-2.1-.3-2.9-.9v4.7a4.2 4.2 0 1 1-4.2-4.2h.4v2.2a2 2 0 1 0 1.7 2V5.2z" transform="translate(-.6 -.4)" />
        <path fill="#FE2C55" d="M13.6 5.2h2.1c.2 1.6 1.2 2.8 2.9 3v2.2c-1.1 0-2.1-.3-2.9-.9v4.7a4.2 4.2 0 1 1-4.2-4.2h.4v2.2a2 2 0 1 0 1.7 2V5.2z" transform="translate(.6 .4)" />
        <path fill="#fff" d="M13.6 5.2h2.1c.2 1.6 1.2 2.8 2.9 3v2.2c-1.1 0-2.1-.3-2.9-.9v4.7a4.2 4.2 0 1 1-4.2-4.2h.4v2.2a2 2 0 1 0 1.7 2V5.2z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      {title && <title>{title}</title>}
      <rect x="1" y="4.5" width="22" height="15" rx="4.5" fill="#FF0033" />
      <path fill="#fff" d="M10 8.6v6.8l5.8-3.4z" />
    </svg>
  );
}
