import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation

import camb

h=0.675
pars = camb.set_params(
    H0=100*h, ombh2=0.022, omch2=0.122, mnu=0.06, omk=0, tau=0.06,
    As=2e-9, ns=0.965
)
# 45 frames (9 s at 5 fps) from z = 20 to 0, evenly spaced in scale factor so the growth looks smooth
redshifts = 1/np.linspace(1/21, 1, 45) - 1
pars.set_matter_power(redshifts=redshifts, kmax=30.0) # kmax in 1/Mpc, must cover the grid's largest k
results = camb.get_results(pars)
kh, z, pk = results.get_matter_power_spectrum(minkh=1e-4, maxkh=30, npoints=400)

# Grid size and resolution
N = 256  # Number of grid points along each dimension
box_size = 200.0  # Physical size of the box in Mpc
R_smooth = 3.0  # Gaussian smoothing radius in Mpc

# Generate k-space grid (angular wavenumbers, in 1/Mpc)
kx = 2*np.pi*np.fft.fftfreq(N, box_size/N)
ky = 2*np.pi*np.fft.fftfreq(N, box_size/N)
kz = 2*np.pi*np.fft.rfftfreq(N, box_size/N)
KX, KY, KZ = np.meshgrid(kx, ky, kz, indexing="ij")
k = np.sqrt(KX**2 + KY**2 + KZ**2)  # Wavenumber magnitude
k[0, 0, 0] = 1 # Avoid log(0), the k = 0 mode is set to zero below
smoothing = np.exp(-(k*R_smooth)**2/2)

# Gaussian white noise with unit variance, its Fourier transform has <|w_k|^2> = N^3
# The same noise is used at every redshift since linear growth preserves the phases
rng = np.random.default_rng(seed=2611)
white_noise_k = np.fft.rfftn(rng.standard_normal(size=(N, N, N)))

# Compute the density slice at each redshift
slices = []
for frame in range(len(redshifts)):
    P_k = pk[len(redshifts) - frame - 1]
    P_k_3d = np.exp(np.interp(np.log(k), np.log(kh * h), np.log(P_k / h**3)))
    P_k_3d[0, 0, 0] = 0 # Zero mean density contrast
    delta_k = white_noise_k * np.sqrt(P_k_3d * N**3 / box_size**3) * smoothing
    density_field = np.fft.irfftn(delta_k, s=(N, N, N), axes=(0, 1, 2))
    # Lognormal transform: keeps delta > -1 and zero mean
    density_field = np.exp(density_field - density_field.var()/2) - 1
    slices.append(np.log1p(density_field[:, :, N//2]).T) # Plot log(1 + delta), transposed so that x is horizontal and y is vertical
# Symmetric color scale so that delta = 0 is the middle color, clipped at the 0.5 and 99.5 percentiles so that a few extreme pixels don't wash out the contrast
lo, hi = np.percentile(np.array(slices), [0.5, 99.5])
vmax = max(-lo, hi)

# Generate animation
duration = 9
fig, ax = plt.subplots(figsize=(8, 6))
fig.patch.set_facecolor("#d1cebb")
im = ax.imshow(slices[0], vmin=-vmax, vmax=vmax, extent=[0, box_size, 0, box_size], origin="lower", cmap="magma")
title = ax.set_title("")
cbar = fig.colorbar(im, label=r"$\log[1 + \delta_m(x, y)]$", ax=ax)
# From https://matplotlib.org/stable/gallery/specialty_plots/anscombe.html#sphx-glr-gallery-specialty-plots-anscombe-py
bbox = dict(boxstyle='round', fc='blanchedalmond', ec='orange', alpha=0.85)
text = ax.text(5, 5, "z", bbox=bbox)
plt.xlabel(r"$x$ (Mpc)")
plt.ylabel(r"$y$ (Mpc)")
plt.title(f"Matter density contrast")

def update(frame):
    # Visualizing a slice
    z = redshifts[frame]
    im.set_data(slices[frame])
    if z >= 10: text.set_text(rf"$z = {z:.0f}$")
    else: text.set_text(rf"$z = {z:.2f}$")
    return (im, text)

interval = duration*1000/len(redshifts)
ani = FuncAnimation(fig, update, frames=len(redshifts), interval=interval, blit=False)
# Save the animation as an MP4 (yuv420p so that all browsers can play it)
# Encoded and tagged as BT.709 so that browsers decode the background to the same color as the page
color_args = ['-vf', 'scale=out_color_matrix=bt709:out_range=pc', '-color_range', 'pc', '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709:fullrange=on']
ani.save('matter_density.mp4', writer='ffmpeg', fps=1000/interval, dpi=120, codec='h264', extra_args=['-pix_fmt', 'yuv420p', *color_args])
