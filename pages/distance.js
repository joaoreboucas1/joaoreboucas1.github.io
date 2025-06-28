function linspace(startValue, stopValue, cardinality) {
    const step = (stopValue - startValue) / (cardinality - 1);
    for (var i = 0; i < cardinality; i++) {
        var r = startValue + (step * i);
        redshifts[i] = parseFloat(r.toFixed(2));
    }
}

function updateDistances() {
  for (var i = 0; i < redshifts.length; i++) {
    linspace(0, zmax, DATA_COUNT);
    comovingDistances[i] = calcDistanceToZ(redshifts[i]);
    luminosityDistances[i] = (1 + redshifts[i])*comovingDistances[i];
    angularDistances[i] = comovingDistances[i]/(1 + redshifts[i]);
  }
}

const c = 299_792.458;
var H0 = 70;
var Omega_m = 0.3;
var Omega_Lambda = 0.7;
var w = -1;
var wa = 0;
var h = H0/100;
var Omega_gamma = 2.47e-5/(h*h); // Photons, Omegarh2 = 2.47e-5 (assuming T_CMB = 2.722K)
var Omega_nu = 1.68e-5/(h*h);    // Massless neutrinos
var Omega_r = Omega_gamma + Omega_nu; // Radiation = photons + massless neutrinos
var Omega_k = 1 - Omega_m - Omega_Lambda - Omega_r;
var zmax = 3; // Controls the upper limit of the plot

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
  return Math.sqrt(Omega_r*(1+z)**4 + Omega_m*(1+z)**3 + Omega_k*(1+z)**2 + Omega_Lambda*(1+z)**(-3*(1+w+wa))*Math.exp(-3*wa*z/(1+z)));
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
const redshifts = new Array(DATA_COUNT)
linspace(0, zmax, DATA_COUNT);
var comovingDistances = new Array(DATA_COUNT);
var luminosityDistances = new Array(DATA_COUNT);
var angularDistances = new Array(DATA_COUNT);
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

function dataframe_new(data, color) {
  return {
    labels: redshifts,
    datasets: [
      {
        label: null,
        data: data,
        borderColor: color,
        backgroundColor: color,
        pointStyle: false,
      },
    ]
  };
}

function config_new(data, color, yLabel) {
  dataframe = dataframe_new(data, color);
  return {
    type: 'line',
    data: dataframe,
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false, },
        title:  { display: false, }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Redshift',
            font: {
              family: 'Inter',
              size: 16,
            }
          },
          ticks: { 
            callback: function(value, index, ticks) { return index % 10 === 0 ? this.getLabelForValue(value) : ''; },
            font: {
              family: 'Inter',
              size: 14,
            }
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: yLabel,
            font: {
              family: 'Inter',
              size: 16,
            }
          },
          ticks: {
            format: { useGrouping: false },
            font: {
              family: 'Inter',
              size: 14,
            }
          }
        }
      }
    },
  };
}

const config1 = config_new(comovingDistances, CHART_COLORS.red, "Comoving Distance (Mpc)");
const config2 = config_new(luminosityDistances, CHART_COLORS.green, "Luminosity Distance (Mpc)");
const config3 = config_new(angularDistances, CHART_COLORS.blue, "Angular Diameter Distance (Mpc)");

var ctx1 = document.getElementById('plotComoving');
var ctx2 = document.getElementById('plotLuminosity');
var ctx3 = document.getElementById('plotAngular');

chart1 = new Chart(ctx1, config1);
chart2 = new Chart(ctx2, config2);
chart3 = new Chart(ctx3, config3);

const H0Box = document.getElementById("H0");
const OmegamBox = document.getElementById("Omegam");
const OmegaLambdaBox = document.getElementById("OmegaLambda");
const wBox = document.getElementById("w");
const waBox = document.getElementById("wa");
const zMaxBox = document.getElementById("zMax");

var updateButton = document.getElementById("updateButton");
updateButton.onclick = () => {
  H0 = parseFloat(H0Box.value);
  Omega_m = parseFloat(OmegamBox.value);
  Omega_Lambda = parseFloat(OmegaLambdaBox.value);
  w = parseFloat(wBox.value);
  wa = parseFloat(waBox.value);
  zmax = parseFloat(zMaxBox.value);
  if (isNaN(H0) || isNaN(Omega_m) || isNaN(Omega_Lambda) || isNaN(w) || isNaN(wa) || isNaN(zmax)) {
    console.log("ERROR: could not parse your inputs.");
    return;
  }
  // Recalculate derived quantities
  h = H0/100;
  Omega_gamma = 2.47e-5/(h*h);
  Omega_nu = 1.68e-5/(h*h);
  Omega_r = Omega_gamma + Omega_nu;
  Omega_k = 1 - Omega_m - Omega_Lambda - Omega_r;
  updateDistances();
  chart1.update();
  chart2.update();
  chart3.update();
}