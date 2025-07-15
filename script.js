document.addEventListener('DOMContentLoaded', () => {
    let appData = {};
    let chartInstance = null;
    let currentSector = 'Capital Goods';

    const sectors = [
        'Capital Goods', 'Consumer Durables', 'Consumer Non-durables', 'Electricity',
        'General', 'Infrastructure/ Construction Goods', 'Intermediate Goods',
        'Manufacturing', 'Mining', 'Primary Goods'
    ];
    
    const modal = document.getElementById("summary-modal");
    const summaryBtn = document.getElementById("summary-btn");
    const closeBtn = document.querySelector(".modal .close-button");

    async function loadData() {
        try {
            const response = await fetch('iip_data.json');
            if (!response.ok) throw new Error(`Could not find iip_data.json`);
            appData = await response.json();
            
            for (const sector in appData) {
                appData[sector].historical.forEach(d => d.Date = new Date(d.Date));
                appData[sector].predictions.forEach(p => p.date = new Date(p.date));
            }

            initializeChart(); 
            setupDashboard();
        } catch (error) {
            console.error('Error fetching the data file:', error);
            document.body.innerHTML = `<div style="padding: 2rem; color: #F87171;"><b>Error: Could not load 'iip_data.json'.</b><br><br>Please make sure you have run the backend script 'python3 run_analysis.py' first to generate the file.</div>`;
        }
    }
    
    function initializeChart() {
        const ctx = document.getElementById('iipChart').getContext('2d');
        Chart.defaults.font.family = "'Inter', sans-serif";
        
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: { 
                labels: [], 
                datasets: [ 
                    { 
                        label: 'IIP Index', 
                        data: [], 
                        type: 'line', 
                        borderColor: '#38BDF8', 
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                        fill: true,
                        yAxisID: 'y-axis-index', 
                        tension: 0.4 
                    }, 
                    { 
                        label: 'AI Forecast', 
                        data: [], 
                        type: 'line', 
                        borderColor: '#F472B6', 
                        borderDash: [5, 5], 
                        yAxisID: 'y-axis-index', 
                        tension: 0.4 
                    }, 
                    { 
                        label: 'Growth Rate (%)', 
                        data: [], 
                        backgroundColor: 'rgba(55, 65, 81, 0.5)', 
                        yAxisID: 'y-axis-growth',
                        borderRadius: 4,
                    } 
                ] 
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                scales: {
                    'y-axis-index': { 
                        position: 'left', 
                        title: { display: true, text: 'Index Points', color: '#9CA3AF', font: { weight: '500' } }, 
                        ticks: { color: '#9CA3AF' }, 
                        grid: { color: '#374151' }
                    },
                    'y-axis-growth': { 
                        position: 'right', 
                        title: { display: true, text: 'Growth (%)', color: '#9CA3AF', font: { weight: '500' } }, 
                        ticks: { color: '#9CA3AF' }, 
                        grid: { drawOnChartArea: false }
                    },
                    x: { 
                        ticks: { color: '#9CA3AF', maxRotation: 45, minRotation: 45 }, 
                        grid: { color: 'rgba(55, 65, 81, 0.5)' }
                    }
                },
                plugins: {
                    legend: { 
                        position: 'top', 
                        labels: { color: '#F9FAFB', usePointStyle: true, boxWidth: 8 },
                        align: 'end'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#111827',
                        titleColor: '#F9FAFB',
                        bodyColor: '#9CA3AF',
                        borderColor: '#374151',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                             label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) { label += context.parsed.y.toFixed(2) + (context.dataset.label.includes('Growth') ? '%' : ''); }
                                return label;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    }

    function setupDashboard() {
        const nav = document.getElementById('sectors-nav');
        sectors.forEach(sector => {
            if (appData[sector]) {
                const button = document.createElement('button');
                button.textContent = sector;
                button.dataset.sector = sector;
                if (sector === currentSector) button.classList.add('active');
                button.addEventListener('click', () => {
                    currentSector = sector;
                    updateDashboard();
                    nav.querySelector('.active')?.classList.remove('active');
                    button.classList.add('active');
                });
                nav.appendChild(button);
            }
        });
        updateDashboard();
    }
    
    function updateDashboard() {
        const sectorData = appData[currentSector];
        if (!sectorData) { return; }

        const historicalData = sectorData.historical.sort((a,b) => a.Date - b.Date);
        const forecastData = sectorData.predictions.sort((a,b) => a.date - b.date);

        updateMetrics(historicalData);
        updateChart(historicalData, forecastData);
    }
    
    function updateMetrics(historicalData) {
        if(historicalData.length === 0) return;
    
        const latestData = historicalData[historicalData.length - 1];
        const avgIndex = historicalData.reduce((acc, curr) => acc + curr.Index, 0) / historicalData.length;
        const avgGrowthValue = historicalData.reduce((acc, curr) => acc + (curr['Growth Rate (%)'] || 0), 0) / historicalData.length;
        
        const latestGrowthEl = document.getElementById('latest-growth');
        const avgGrowthEl = document.getElementById('avg-growth');
    
        // Reset classes
        latestGrowthEl.classList.remove('positive', 'negative');
        avgGrowthEl.classList.remove('positive', 'negative');
    
        if (latestData) {
            const latestGrowthValue = latestData['Growth Rate (%)'] || 0;
            document.getElementById('latest-index').textContent = latestData.Index.toFixed(1);
            latestGrowthEl.textContent = `${latestGrowthValue.toFixed(1)}%`;
            if (latestGrowthValue > 0) {
                latestGrowthEl.classList.add('positive');
            } else if (latestGrowthValue < 0) {
                latestGrowthEl.classList.add('negative');
            }
        }
    
        document.getElementById('avg-index').textContent = avgIndex.toFixed(1);
        avgGrowthEl.textContent = `${avgGrowthValue.toFixed(1)}%`;
        if (avgGrowthValue > 0) {
            avgGrowthEl.classList.add('positive');
        } else if (avgGrowthValue < 0) {
            avgGrowthEl.classList.add('negative');
        }
    
        document.getElementById('chart-title').textContent = `${currentSector}: IIP Index & Growth Rate`;
    }
    
    function updateChart(historicalData, forecastData) {
        if (!chartInstance) return;

        const allDataPoints = [...historicalData, ...forecastData];
        
        chartInstance.data.labels = allDataPoints.map(d => {
            const date = new Date(d.Date || d.date);
            return `${date.toLocaleString('default', { month: 'short' })} '${date.getFullYear().toString().slice(-2)}`;
        });
        
        const historicalIndex = historicalData.map(d => d.Index);
        chartInstance.data.datasets[0].data = historicalIndex.concat(new Array(forecastData.length).fill(null));
        
        const forecastIndex = forecastData.map(d => d.index);
        chartInstance.data.datasets[1].data = new Array(historicalIndex.length - 1).fill(null).concat([historicalIndex[historicalIndex.length-1]], forecastIndex);
        
        chartInstance.data.datasets[2].data = historicalData.map(d => d['Growth Rate (%)']);
        
        chartInstance.update();
    }
    
    function showSummary() {
        const sectorData = appData[currentSector];
        if (!sectorData || !sectorData.summary) return;

        const loader = document.getElementById('summary-loader');
        const content = document.getElementById('summary-content');
        
        loader.style.display = 'block';
        content.style.display = 'none';
        modal.style.display = 'flex';

        setTimeout(() => {
            const summaryHTML = `<p>${sectorData.summary.replace(/\n/g, '</p><p>')}</p>`;
            document.getElementById('summary-title').textContent = `AI Summary for ${currentSector}`;
            document.getElementById('summary-text').innerHTML = summaryHTML;
            
            loader.style.display = 'none';
            content.style.display = 'block';
        }, 1200); 
    }

    summaryBtn.addEventListener("click", showSummary);
    closeBtn.addEventListener("click", () => { modal.style.display = "none"; });
    window.addEventListener("click", (event) => {
        if (event.target == modal) { modal.style.display = "none"; }
    });

    loadData();
});