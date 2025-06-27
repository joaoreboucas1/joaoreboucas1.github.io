function linspace(startValue, stopValue, cardinality) {
    const step = (stopValue - startValue) / (cardinality - 1);
    var arr = [];
    for (var i = 0; i < cardinality; i++) {
        var r = startValue + (step * i);
        arr.push(parseFloat(r.toFixed(2)));
    }
    return arr;
}

function updateDistances() {
  for (var i = 0; i < redshifts.length; i++) {
    distances[i] = calcDistanceToZ(redshifts[i]);
  }
}

const c = 299_792.458;
const Omega_nu = 0.0; // Massless neutrinos | TODO: fill Omega_nu for massless neutrinos
var H0 = 70;
var Omega_m = 0.3;
var Omega_Lambda = 0.7;
var h = H0/100;
var Omega_r = 2.47e-5/(h*h); // Photons, Omegarh2 = 2.47e-5 (assuming T_CMB = 2.722K)
var Omega_k = 1 - Omega_m - Omega_Lambda - Omega_r - Omega_nu;

const SK_TOL = 1e-8;
function S_k(x) {
  if (Omega_k > SK_TOL) {
    return (1/Math.sqrt(Omega_k))*Math.sin(Math.sqrt(Omega_k)*x);
  } else if (Omega_k < -SK_TOL) {
    return (1/Math.sqrt(-Omega_k))*Math.sinh(Math.sqrt(-Omega_k)*x);
  } else {
    return x;
  }
}

function H_over_H0(z) {
  return Math.sqrt((Omega_r + Omega_nu)*(1+z)**4 + Omega_m*(1+z)**3 + Omega_k*(1+z)**2 + Omega_Lambda);
}

const TRAPZ_N = 200;
function calcDistanceToZ(z) {
  // d\chi = d\tau = dt/a = da/(a*\dot{a}) = da/(a^2*H)
  // dz = -da/a^2 (minus sign inverts the integration limits)
  // d\chi = dz/H(z)
  // Bounds are 0 to z
  // Using trapezoid method
  var result = 0.5*(1 + 1/H_over_H0(z));
  const dz = z/TRAPZ_N;
  for (var i = 1; i < TRAPZ_N; i++) {
    const x_i = i*dz;
    result += 1/(H_over_H0(x_i));
  }
  return (c/H0)*result*dz;
}

const DATA_COUNT = 100;
const redshifts = linspace(0, 3, DATA_COUNT);
var distances = new Array(DATA_COUNT);
updateDistances();

const CHART_COLORS = {
  red: 'rgb(255, 99, 132)',
  orange: 'rgb(255, 159, 64)',
  yellow: 'rgb(255, 205, 86)',
  green: 'rgb(75, 192, 192)',
  blue: 'rgb(54, 162, 235)',
  purple: 'rgb(153, 102, 255)',
  grey: 'rgb(201, 203, 207)'
};

const dataframe = {
  labels: redshifts,
  datasets: [
    {
      label: null,
      data: distances,
      borderColor: CHART_COLORS.red,
      backgroundColor: CHART_COLORS.red,
      pointStyle: false,
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
        display: false,
      },
      title: {
        display: false,
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Redshift'
        },
        ticks: {
          callback: function(value, index, ticks) {
            return value % 0.5 === 0 ? this.getLabelForValue(value) : '';
          }
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Comoving Distance (Mpc)'
        },
        ticks: {
          format: { useGrouping: false },
        }
      }
    }
  },
};

var ctx = document.getElementById('plot');
chart = new Chart(ctx, config);

const H0Box = document.getElementById("H0");
const OmegamBox = document.getElementById("Omegam");
const OmegaLambdaBox = document.getElementById("OmegaLambda");

var updateButton = document.getElementById("updateButton");
updateButton.onclick = () => {
  try {
    H0 = parseFloat(H0Box.value);
    Omega_m = parseFloat(OmegamBox.value);
    Omega_Lambda = parseFloat(OmegaLambdaBox.value);
  } catch {
    console.log("ERROR: could not parse your inputs.")
    return;
  }
  // Recalculate derived quantities
  h = H0/100;
  Omega_r = 2.47e-5/(h*h); // Photons, Omegarh2 = 2.47e-5 (assuming T_CMB = 2.722K)
  Omega_k = 1 - Omega_m - Omega_Lambda - Omega_r - Omega_nu;
  updateDistances();
  chart.update();
}