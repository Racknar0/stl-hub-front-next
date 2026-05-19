'use client';
import React, { useState } from 'react';
import './PinterestCalendar.scss';

export default function PinterestCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  
  // Estados para el buscador de assets
  const [searchMode, setSearchMode] = useState('id'); // 'id' o 'name'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedAsset, setSearchedAsset] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);

  // Generar días del mes
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) { days.push(null); }
  for (let i = 1; i <= daysInMonth; i++) { days.push(i); }

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // Simular la búsqueda de un Asset en la Base de Datos
  const handleSearch = () => {
    if (!searchQuery) return;
    
    // Mock de Asset devuelto por la DB
    setSearchedAsset({
      id: searchMode === 'id' ? searchQuery : '8492',
      title: 'Busto Épico de Batman Alta Calidad (STL)',
      description: 'Descarga este increíble busto de Batman en formato STL listo para imprimir en 3D. Diseño de altísima calidad con soportes incluidos.',
      slug: 'busto-epico-batman-alta-calidad',
      category: 'Sci-Fi Models',
      images: [
        'https://images.unsplash.com/photo-1611604548018-d56bbd85d681?q=80&w=500&auto=format&fit=crop', // Imagen pro 1
        'https://images.unsplash.com/photo-1588497859490-85d1c17defcb?q=80&w=500&auto=format&fit=crop', // Imagen pro 2
        'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=500&auto=format&fit=crop', // Malla basura / wireframe
        'https://images.unsplash.com/photo-1580477659154-081a8b9e0787?q=80&w=500&auto=format&fit=crop', // Otra vista
      ]
    });
    setSelectedImages([]); // Resetear selecciones
  };

  const toggleImageSelection = (imgUrl) => {
    if (selectedImages.includes(imgUrl)) {
      setSelectedImages(selectedImages.filter(img => img !== imgUrl));
    } else {
      setSelectedImages([...selectedImages, imgUrl]);
    }
  };

  const dummyPins = { 15: 3, 18: 5, 22: 2, 25: 12 };

  return (
    <div className="pinterest-calendar-container">
      {/* HEADER Y CALENDARIO (Igual que antes) */}
      <div className="calendar-header">
        <div className="header-info">
          <h2>Calendario de Publicaciones (Pinterest)</h2>
          <p>Programa tu contenido de forma orgánica y estructurada.</p>
        </div>
        <div className="month-navigation">
          <button onClick={handlePrevMonth} className="nav-btn">←</button>
          <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
          <button onClick={handleNextMonth} className="nav-btn">→</button>
        </div>
      </div>

      <div className="calendar-grid">
        <div className="weekdays">
          <span>Dom</span><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span>
        </div>
        <div className="days">
          {days.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} className="day empty"></div>;
            const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
            const pinsCount = dummyPins[day] || 0;
            const isSelected = selectedDay === day;

            return (
              <div 
                key={`day-${day}`} 
                className={`day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                <div className="day-number">{day}</div>
                {pinsCount > 0 && (
                  <div className="pin-indicator">
                    <span className="dot"></span><span className="count">{pinsCount} Pines</span>
                  </div>
                )}
                {isSelected && <button className="add-pin-btn">+ Programar</button>}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL LATERAL - FLUJO DE SELECCIÓN DE 2 PASOS */}
      <div className={`side-panel ${selectedDay ? 'open' : ''}`}>
        {selectedDay && (
          <div className="panel-content scrollable">
            <button className="close-panel" onClick={() => setSelectedDay(null)}>✕</button>
            <h3>Programar para el {selectedDay} de {monthNames[currentDate.getMonth()]}</h3>
            
            {/* 1. BUSCADOR DE ASSETS */}
            <div className="form-group search-group">
              <label>1. Buscar Asset en la Base de Datos</label>
              
              <div className="search-toggles">
                <label className={`toggle-btn ${searchMode === 'id' ? 'active' : ''}`}>
                  <input type="radio" name="searchMode" checked={searchMode === 'id'} onChange={() => setSearchMode('id')} />
                  Buscar por ID
                </label>
                <label className={`toggle-btn ${searchMode === 'name' ? 'active' : ''}`}>
                  <input type="radio" name="searchMode" checked={searchMode === 'name'} onChange={() => setSearchMode('name')} />
                  Buscar por Nombre
                </label>
              </div>

              <div className="search-bar">
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={searchMode === 'id' ? "Ej: 15482..." : "Ej: Batman Arkham..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button className="btn-search" onClick={handleSearch}>Buscar</button>
              </div>
            </div>

            {/* 2. Criba Visual (Selección de Imágenes) */}
            {searchedAsset && (
              <div className="asset-results">
                <div className="asset-header">
                  <span className="badge">ID: {searchedAsset.id}</span>
                  <h4>{searchedAsset.title}</h4>
                </div>

                <label className="instruction-label">
                  2. Selecciona las imágenes de calidad para publicar ({selectedImages.length} seleccionadas)
                </label>

                <div className="image-grid">
                  {searchedAsset.images.map((img, idx) => {
                    const isSelected = selectedImages.includes(img);
                    return (
                      <div 
                        key={idx} 
                        className={`image-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleImageSelection(img)}
                      >
                        <img src={img} alt={`Render ${idx}`} />
                        {isSelected && <div className="check-overlay">✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* OPCIONES FINALES */}
            <div className={`final-options ${selectedImages.length > 0 ? 'visible' : 'hidden'}`}>
              
              <div className="form-group info-group">
                <label>3. Información del Pin (Autocompletado)</label>
                <p className="help-text">Hemos extraído esta información de la base de datos, pero puedes modificarla para Pinterest.</p>
                
                <input 
                  type="text" 
                  className="form-input" 
                  defaultValue={searchedAsset?.title} 
                  placeholder="Título del Pin"
                  style={{marginBottom: '0.5rem'}}
                />
                
                <textarea 
                  className="form-input" 
                  rows="3"
                  defaultValue={searchedAsset?.description}
                  placeholder="Descripción detallada"
                  style={{marginBottom: '0.5rem', resize: 'vertical'}}
                />

                <input 
                  type="text" 
                  className="form-input" 
                  defaultValue={`https://stlhub.com/asset/${searchedAsset?.slug}`}
                  placeholder="Enlace de destino"
                />
              </div>

              <div className="form-group">
                <label>4. Tablero de Destino</label>
                <select className="form-input">
                  <option>Automático ({searchedAsset?.category})</option>
                  <option>General 3D Models</option>
                </select>
              </div>

              <div className="form-group filters-group">
                <label>Filtros Anti-Spam (Para cada imagen)</label>
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked />
                  <span className="checkbox-text">Efecto Espejo Aleatorio</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked />
                  <span className="checkbox-text">Micro-Zoom 5% y Recorte</span>
                </label>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="panel-actions">
              <button className="btn-secondary" onClick={() => setSelectedDay(null)}>Cancelar</button>
              <button 
                className={`btn-primary ${selectedImages.length === 0 ? 'disabled' : ''}`}
                disabled={selectedImages.length === 0}
              >
                Añadir {selectedImages.length} Pines a la Cola
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
