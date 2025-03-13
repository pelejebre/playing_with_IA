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

// Configuración de colores y formato
const config = {
    colors: {
        primary: '#800020',
        white: '#FFFFFF',
        black: '#000000'
    },
    formatCurrency: new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }),
    months: [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
};

// Funciones de utilidad
const showLoading = () => document.getElementById('loadingIndicator').style.display = 'block';
const hideLoading = () => document.getElementById('loadingIndicator').style.display = 'none';

// Carga inicial de datos
async function loadData() {
    try {
        showLoading();
        console.log('Iniciando carga de datos...');
        const response = await fetch('historico.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        console.log('CSV cargado correctamente');
        
        // Parsear CSV usando d3
        state.rawData = d3.csvParse(csvText, d => ({
            year: +d.Año,
            month: +d.Mes,
            country: d.País,
            product: d.Producto,
            sales: +d["Ventas (Euros)"]
        }));

        if (state.rawData.length === 0) {
            throw new Error('No se encontraron datos en el archivo CSV');
        }

        console.log('Datos parseados:', state.rawData.length, 'registros');
        state.filteredData = [...state.rawData];
        initializeSelectors();
        updateDashboard();
        
    } catch (error) {
        console.error('Error al cargar los datos:', error);
        alert(`Error al cargar los datos: ${error.message}. Por favor, verifica que el archivo CSV existe y tiene el formato correcto.`);
    } finally {
        hideLoading();
    }
}

// Inicialización de selectores
function initializeSelectors() {
    console.log('Inicializando selectores...');
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
    if (!selector) {
        console.error(`Selector no encontrado: ${id}`);
        return;
    }
    selector.innerHTML = '<option value="all">Todos</option>' +
        options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
}

function handleFilterChange(event) {
    const filterType = event.target.id.replace('Selector', '');
    state.currentFilters[filterType] = event.target.value;
    
    filterData();
    updateDashboard();
}

function filterData() {
    state.filteredData = state.rawData.filter(d => {
        return (state.currentFilters.year === 'all' || d.year === +state.currentFilters.year) &&
               (state.currentFilters.country === 'all' || d.country === state.currentFilters.country) &&
               (state.currentFilters.product === 'all' || d.product === state.currentFilters.product);
    });
}

function updateDashboard() {
    console.log('Actualizando dashboard...');
    updateStats();
    updateHeatmap();
    updateStackedBar();
    updateLineChart();
    updatePieChart();
    updateDataTable();
}

function updateStats() {
    const totalSales = d3.sum(state.filteredData, d => d.sales);
    const salesByProduct = d3.group(state.filteredData, d => d.product);
    const salesByCountry = d3.group(state.filteredData, d => d.country);

    const topProduct = Array.from(salesByProduct, ([key, value]) => ({
        product: key,
        sales: d3.sum(value, d => d.sales)
    })).sort((a, b) => b.sales - a.sales)[0];

    const topCountry = Array.from(salesByCountry, ([key, value]) => ({
        country: key,
        sales: d3.sum(value, d => d.sales)
    })).sort((a, b) => b.sales - a.sales)[0];

    document.getElementById('totalSales').textContent = config.formatCurrency.format(totalSales);
    document.getElementById('topProduct').textContent = topProduct?.product || '-';
    document.getElementById('topCountry').textContent = topCountry?.country || '-';
}

function updateHeatmap() {
    // Obtener años únicos ordenados
    const years = [...new Set(state.filteredData.map(d => d.year))].sort();
    const months = Array.from({length: 12}, (_, i) => i + 1);
    
    // Crear matriz de ventas por mes y año
    const salesMatrix = months.map(month => {
        return years.map(year => {
            const salesForYearMonth = state.filteredData
                .filter(d => d.year === year && d.month === month)
                .reduce((sum, d) => sum + d.sales, 0);
            return salesForYearMonth;
        });
    });

    const data = [{
        z: salesMatrix,
        x: years,
        y: config.months,
        type: 'heatmap',
        colorscale: [
            [0, config.colors.white],
            [1, config.colors.primary]
        ],
        hoverongaps: false,
        hovertemplate: 
            'Año: %{x}<br>' +
            'Mes: %{y}<br>' +
            'Ventas: %{z:,.0f}€<extra></extra>'
    }];

    const layout = {
        title: {
            text: 'Distribución de Ventas por Mes y Año',
            font: { size: 16 }
        },
        xaxis: {
            title: 'Año',
            type: 'category',
            tickmode: 'array',
            ticktext: years,
            tickvals: years,
            tickangle: 0
        },
        yaxis: {
            title: 'Mes',
            type: 'category',
            tickmode: 'array',
            ticktext: config.months,
            tickvals: config.months
        },
        margin: {
            l: 150,  // Margen izquierdo aumentado para nombres de meses
            r: 50,
            b: 50,
            t: 50,
            pad: 4
        },
        annotations: [],
        coloraxis: {
            colorbar: {
                title: 'Ventas (€)',
                tickformat: ',.0f'
            }
        }
    };

    const plotConfig = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };

    Plotly.newPlot('heatmap', data, layout, plotConfig);
}

function updateStackedBar() {
    // Obtener años únicos ordenados
    const years = [...new Set(state.filteredData.map(d => d.year))].sort();

    const data = Array.from(
        d3.group(state.filteredData, d => d.country),
        ([country, values]) => {
            const yearSales = d3.rollup(values,
                v => d3.sum(v, d => d.sales),
                d => d.year
            );
            return {
                x: years, // Usar array de años ordenado
                y: years.map(year => yearSales.get(year) || 0), // Mapear ventas para cada año
                name: country,
                type: 'bar'
            };
        }
    );

    const layout = {
        barmode: 'stack',
        title: 'Ventas por País y Año',
        xaxis: {
            title: 'Año',
            type: 'category',
            tickmode: 'array',
            ticktext: years,
            tickvals: years,
            tickangle: 0
        },
        yaxis: {
            title: 'Ventas (€)',
            tickformat: ',.0f'
        },
        hovertemplate: '%{y:,.0f}€<extra>%{data.name}</extra>'
    };

    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };

    Plotly.newPlot('stackedBar', data, layout, config);
}

function updateLineChart() {
    const data = Array.from(
        d3.group(state.filteredData, d => d.product),
        ([product, values]) => {
            const sorted = values.sort((a, b) => 
                (a.year * 12 + a.month) - (b.year * 12 + b.month)
            );
            return {
                x: sorted.map(d => `${d.year}-${d.month.toString().padStart(2, '0')}`),
                y: sorted.map(d => d.sales),
                name: product,
                type: 'scatter',
                mode: 'lines+markers'
            };
        }
    );

    const layout = {
        title: 'Evolución de Ventas por Producto',
        xaxis: { title: 'Fecha' },
        yaxis: { title: 'Ventas (€)' }
    };

    Plotly.newPlot('lineChart', data, layout);
}

function updatePieChart() {
    const salesByProduct = Array.from(
        d3.rollup(state.filteredData,
            v => d3.sum(v, d => d.sales),
            d => d.product
        ),
        ([product, sales]) => ({ product, sales })
    );

    const data = [{
        values: salesByProduct.map(d => d.sales),
        labels: salesByProduct.map(d => d.product),
        type: 'pie',
        marker: {
            colors: [config.colors.primary, '#400010', '#C00030']
        }
    }];

    const layout = {
        title: 'Distribución por Producto'
    };

    Plotly.newPlot('pieChart', data, layout);
}

function updateDataTable() {
    const table = document.getElementById('dataTable');
    if (!table) return;

    const headers = ['Año', 'Mes', 'País', 'Producto', 'Ventas'];
    
    table.innerHTML = `
        <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
            ${state.filteredData.map(d => `
                <tr>
                    <td>${d.year}</td>
                    <td>${d.month}</td>
                    <td>${d.country}</td>
                    <td>${d.product}</td>
                    <td>${config.formatCurrency.format(d.sales)}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
}

// Inicialización
document.addEventListener('DOMContentLoaded', loadData);