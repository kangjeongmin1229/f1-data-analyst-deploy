// Research-only alternative. Production energy helper and fitted constants remain unchanged.
// Hypercar stint energy (WEC "virtual energy tank"): the rules measure the energy delivered at the
// driveshafts (torque sensors) from pit-out to pit-in and cap it per stint (BoP, MJ). From a simulated
// lap we get the same quantity: the positive work the car needs at the wheels (kinetic energy gained +
// drag + rolling resistance + climbing), summed over the lap.
import {tailwind} from '../../../worker/lapsim/atmosphere.js';
const G = 9.81;

// Driveshaft energy (J) of one lap with speed profile v (m/s) on track (kernel track object)
export function driveEnergyWithWindJ(track, car, env, v) {
  const n = v.length, ds = track.ds, rho = env?.rho ?? 1.2, m = car.mass * (car.inertiaFactor ?? 1), cr = car.cRoll ?? 0.012;
  let e = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, vm = 0.5 * (v[i] + v[j]), low = track.aeroLow?.[i];
    // Keep the kernel's existing along-track wind convention. Work remains force × ground distance.
    const tail = track.heading && env?.windSpeed ? tailwind(track.heading[i], env.windSpeed, env.windFromDeg ?? 0) : 0;
    const va = Math.max(0, vm - tail);
    const drag = 0.5 * rho * (low ? car.cdALow ?? car.cdA : car.cdA) * va * va, down = 0.5 * rho * (low ? car.clALow ?? car.clA : car.clA) * va * va;
    const climb = car.mass * G * (track.grade?.[i] ?? 0);
    const w = 0.5 * m * (v[j] * v[j] - v[i] * v[i]) + (drag + cr * (car.mass * G + down) + climb) * ds;
    if (w > 0) e += w;
  }
  return e;
}

