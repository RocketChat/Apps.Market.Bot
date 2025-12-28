export class ChartService {
    public static getChartUrl(symbol: string, data: { date: string; price: number }[], isCrypto: boolean, isDark: boolean): string {

        if (!data || data.length === 0) return '';

        let validData = data
            .slice()
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const MAX_POINTS = 50;
        if (validData.length > MAX_POINTS) {
            validData = validData.slice(validData.length - MAX_POINTS);
        }

        if (validData.length < 2) return '';
        const prices = validData.map(x => x.price);

        const chartBackgroundColor = isDark ? '#1F2329' : '#ffffff';
        const textColor = isDark ? '#ffffff' : '#333333';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const isUp = prices[prices.length - 1] >= prices[0];
        const borderColor = isUp ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)';
        const fillColor = isUp ? 'rgba(75, 192, 192, 0.1)' : 'rgba(255, 99, 133, 0.1)';

        const formattedDates = validData.map((item, index) => {
            if (index === 0) return " ";
            return new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });


        const config = {
            type: 'line',
            data: {
                labels: formattedDates,
                datasets: [{
                    label: symbol,
                    data: prices,
                    borderColor: borderColor,
                    backgroundColor: fillColor,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    borderWidth: 3
                }]
            },
            options: {
                legend: {
                    display: false
                },
                title: {
                    display: false,
                },
                layout: {
                    padding: { left: 20, right: 20, top: 30, bottom: 10 }
                },
                scales: {
                    xAxes: [{
                        display: true,
                        gridLines: { display: false },
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 6,
                            fontSize: 21,
                            fontStyle: 'bold',
                            fontColor: textColor,
                            padding: 2,
                        }
                    }],
                    yAxes: [{
                        display: true,
                        gridLines: {
                            color: gridColor,
                            drawBorder: false,
                        },
                        ticks: {
                            maxTicksLimit: 8,
                            fontSize: 21,
                            fontStyle: 'bold',
                            fontColor: textColor,
                            padding: 8,
                        }
                    }]
                }
            }
        };

        const encodedConfig = encodeURIComponent(JSON.stringify(config));

        return `https://quickchart.io/chart?c=${encodedConfig}&width=900&height=800&backgroundColor=${encodeURIComponent(chartBackgroundColor)}`;
    }
}