// Estado global de la aplicación
const state = {
    rawData: [],
    filteredData: [],
    currentFilters: {
        year: 'all',
        country: 'all',
        product: 'all'
    }
};

// Configuración de colores
const colors = {
    primary: '#800020',
    white: '#FFFFFF',
    black: '#000000'
};

// Funciones de utilidad
const formatCurrency = (value) => `€${value.toLocaleString('es-ES')}`;
const showLoading = () => document.getElementById('loadingIndicator').style.display = 'block';
const hideLoading = () => document.getElementById('loadingIndicator').style.display = 'none';

// Carga inicial de datos
async function loadData() {
    try {
        showLoading();
        const response = await fetch('historico.csv');
        const csvData = await response.text();
        
        state.rawData = d3.csvParse(csvData, d => ({
            year: +d.Año,
            month: +d.Mes,
            country: d.País,
            product: d.Producto,
            sales: +d.Ventas
        }));
        
        state.filteredData = [...state.rawData];
        initializeSelectors();
        updateDashboard();
    } catch (error) {
        alert('Error al cargar los datos. Por favor, recarga la página.');
        console.error('Error loading data:', error);
    } finally {
        hideLoading();
    }
}

// Inicialización de selectores
function initializeSelectors() {
    const years = [...new Set(state.rawData.map(d => d.year))].sort();
    const countries = [...new Set(state.rawData.map(d => d.country))].sort();
    const products = [...new Set(state.rawData.map(d => d.product))].sort();

    populateSelector('yearSelector', years);
    populateSelector('countrySelector', countries);
    populateSelector('productSelector', products);

    // Event listeners
    ['yearSelector', 'countrySelector', 'productSelector'].forEach(id => {
        document.getElementById(id).addEventListener('change', handleFilterChange);
    });
}

function populateSelector(id, options) {
    const selector = document.getElementById(id);
    selector.innerHTML = '<option value="all">Todos</option>' +
        options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
}

// Manejo de filtros
function handleFilterChange(event) {
    const filter = event.target.id.replace('Selector', '');
    state.currentFilters[filter] = event.target.value;
    
    state.filteredData = state.rawData.filter(d => {
        return (state.currentFilters.year === 'all' || d.year === +state.currentFilters.year) &&
               (state.currentFilters.country === 'all' || d.country === state.currentFilters.country) &&
               (state.currentFilters.product === 'all' || d.product === state.currentFilters.product);
    });

    updateDashboard();
}

// Actualización del dashboard
function updateDashboard() {
    updateStats();
    updateHeatmap();
    updateStackedBar();
    updateLineChart();
    updatePieChart();
    updateDataTable();
}

// Actualización de estadísticas
function updateStats() {
    const totalSales = d3.sum(state.filteredData, d => d.sales);
    const salesByProduct = d3.group(state.filteredData, d => d.product);
    const salesByCountry = d3.group(state.filteredData, d => d.country);

    let topProduct = [...salesByProduct.entries()]
        .map(([product, data]) => ({product, sales: d3.sum(data, d => d.sales)}))
        .sort((a, b) => b.sales - a.sales)[0];

    let topCountry = [...salesByCountry.entries()]
        .map(([country, data]) => ({country, sales: d3.sum(data, d => d.sales)}))
        .sort((a, b) => b.sales - a.sales)[0];

    document.getElementById('totalSales').textContent = formatCurrency(totalSales);
    document.getElementById('topProduct').textContent = topProduct ? topProduct.product : '-';
    document.getElementById('topCountry').textContent = topCountry ? topCountry.country : '-';
}

// Visualizaciones
function updateHeatmap() {
    const heatmapData = d3.group(state.filteredData, d => d.year, d => d.month);
    const years = [...heatmapData.keys()].sort();
    const months = Array.from({length: 12}, (_, i) => i + 1);
    
    const z = months.map(month => 
        years.map(year => {
            const sales = heatmapData.get(year)?.get(month);
            return sales ? d3.sum(sales, d => d.sales) : 0;
        })
    );

    const data = [{
        z: z,
        x: years,
        y: months,
        type: 'heatmap',
        colorscale: [[0, '#FFFFFF'], [1, colors.primary]],
        hoverongaps: false
    }];

    Plotly.newPlot('heatmap', data, {
        title: 'Distribución de Ventas por Mes y Año',
        xaxis: {title: 'Año'},
        yaxis: {title: 'Mes'}
    });
}

function updateStackedBar() {
    const data = Array.from(d3.group(state.filteredData, d => d.country), 
        ([country, values]) => ({
            x: [...new Set(values.map(d => d.year))].sort(),
            y: values.map(d => d.sales),
            name: country,
            type: 'bar'
        })
    );

    Plotly.newPlot('stackedBar', data, {
        barmode: 'stack',
        title: 'Ventas por País y Año',
        xaxis: {title: 'Año'},
        yaxis: {title: 'Ventas (€)'}
    });
}

function updateLineChart() {
    const data = Array.from(d3.group(state.filteredData, d => d.product),
        ([product, values]) => ({
            x: values.map(d => `${d.year}-${d.month}`),
            y: values.map(d => d.sales),
            name: product,
            type: 'scatter',
            mode: 'lines+markers'
        })
    );

    Plotly.newPlot('lineChart', data, {
        title: 'Evolución de Ventas por Producto',
        xaxis: {title: 'Fecha'},
        yaxis: {title: 'Ventas (€)'}
    });
}

function updatePieChart() {
    const salesByProduct = Array.from(d3.group(state.filteredData, d => d.product),
        ([product, values]) => ({
            product,
            sales: d3.sum(values, d => d.sales)
        })
    );

    const data = [{
        values: salesByProduct.map(d => d.sales),
        labels: salesByProduct.map(d => d.product),
        type: 'pie',
        marker: {
            colors: [colors.primary, '#400010', '#C00030']
        }
    }];

    Plotly.newPlot('pieChart', data, {
        title: 'Distribución por Producto'
    });
}

function updateDataTable() {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = state.filteredData
        .map(d => `
            <tr>
                <td>${d.year}</td>
                <td>${d.month}</td>
                <td>${d.country}</td>
                <td>${d.product}</td>
                <td>${formatCurrency(d.sales)}</td>
            </tr>
        `)
        .join('');
}

// Inicialización
document.addEventListener('DOMContentLoaded', loadData);