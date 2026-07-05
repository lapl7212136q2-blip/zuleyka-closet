interface Filters {
  type: string;
  color: string;
  style: string;
  season: string;
}

interface FilterPanelProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
}

export default function FilterPanel({ filters, setFilters }: FilterPanelProps) {
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleReset = () => {
    setFilters({ type: '', color: '', style: '', season: '' });
  };

  return (
    <div className="filters">
      <div className="filter-group">
        <label htmlFor="type">Tipo de prenda</label>
        <select
          id="type"
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
        >
          <option value="">Todas</option>
          <option value="vestido">Vestido</option>
          <option value="pantalon">Pantalón</option>
          <option value="blusa">Blusa</option>
          <option value="falda">Falda</option>
          <option value="chaqueta">Chaqueta</option>
          <option value="suéter">Suéter</option>
          <option value="abrigo">Abrigo</option>
          <option value="zapatos">Zapatos</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="color">Color</label>
        <input
          id="color"
          type="text"
          placeholder="Ej: azul, rojo"
          value={filters.color}
          onChange={(e) => handleFilterChange('color', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="style">Estilo</label>
        <select
          id="style"
          value={filters.style}
          onChange={(e) => handleFilterChange('style', e.target.value)}
        >
          <option value="">Todos</option>
          <option value="casual">Casual</option>
          <option value="formal">Formal</option>
          <option value="deportivo">Deportivo</option>
          <option value="elegante">Elegante</option>
          <option value="bohemio">Bohemio</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="season">Estación</label>
        <select
          id="season"
          value={filters.season}
          onChange={(e) => handleFilterChange('season', e.target.value)}
        >
          <option value="">Todas</option>
          <option value="primavera">Primavera</option>
          <option value="verano">Verano</option>
          <option value="otono">Otoño</option>
          <option value="invierno">Invierno</option>
        </select>
      </div>

      <div className="filter-group" style={{ justifyContent: 'flex-end', paddingTop: '1.5rem' }}>
        <button
          onClick={handleReset}
          style={{
            padding: '0.5rem 1rem',
            background: '#f0f0f0',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
