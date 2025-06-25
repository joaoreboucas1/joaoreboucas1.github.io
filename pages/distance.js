function linspace(startValue, stopValue, cardinality) {
    const step = (stopValue - startValue) / (cardinality - 1);
    var arr = [];
    for (var i = 0; i < cardinality; i++) {
        var r = startValue + (step * i);
        arr.push(parseFloat(r.toFixed(2)));
    }
    return arr;
}

function randomizeData(data) {
    for (let i = 0; i < DATA_COUNT; i++) {
        data[i] = (Math.random());
    }
}

const ctx = document.getElementById('plot');

const CHART_COLORS = {
  red: 'rgb(255, 99, 132)',
  orange: 'rgb(255, 159, 64)',
  yellow: 'rgb(255, 205, 86)',
  green: 'rgb(75, 192, 192)',
  blue: 'rgb(54, 162, 235)',
  purple: 'rgb(153, 102, 255)',
  grey: 'rgb(201, 203, 207)'
};

const DATA_COUNT = 10;
const redshifts = linspace(0, 3, DATA_COUNT);
var data = new Array(DATA_COUNT);
randomizeData(data);

const dataframe = {
  labels: redshifts,
  datasets: [
    {
      label: 'Dataset 1',
      data: data,
      borderColor: CHART_COLORS.red,
      backgroundColor: CHART_COLORS.red,
    },
  ]
};

const config = {
  type: 'line',
  data: dataframe,
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Chart.js Line Chart'
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Redshift'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Comoving Distance (Mpc)'
        },
      }
    }
  },
};

chart = new Chart(ctx, config);

var updateButton = document.getElementById("updateButton");
updateButton.onclick = () => {
    randomizeData(data);
    chart.update();
}