% Independent optimizer check (diagnostic only, no model change). Question: under downforce/drag <= ldMax,
% can a different optimizer (fmincon, multi-start) find a Hypercar that matches the fitted laps better than
% the Nelder-Mead fit did? Objective: lap-time RMS error (%) over the fitted tracks; constraint: trap RMS
% no more than 2 km/h worse than the unconstrained fitted car. Run from the repo root:
%   matlab -batch "addpath('scripts/sim/matlab'); ld_check('scripts/sim/results/wec-ld-2026-11-14/cal-R0.js','lmh','2025',4)"
function ld_check(cal, cls, year, ldMax)
  names = {'muY','clA','cdA'}; lb = [1.3 2 0.7]; ub = [2.2 7 1.6];
  function [lapRms, trapRms] = sim(x)
    s = struct('cal', fullfile(pwd, cal), 'cls', cls, 'year', year); s.samples = {cell2struct(num2cell(x(:)), names(1:numel(x)), 1)};
    if isempty(x), s.samples = {struct()}; end
    f = [tempname '.json']; fid = fopen(f, 'w'); fwrite(fid, jsonencode(s)); fclose(fid);
    [st, out] = system(['node scripts/sim/wec-sensitivity.mjs < "' f '"']); delete(f); assert(st == 0, out);
    r = jsondecode(out); n = numel(r.tracks); y = r.out(:)'; real = [r.tracks.realLap];
    trap = arrayfun(@(t) double_or_nan(t.trapKph), r.tracks)';
    lapRms = sqrt(mean((y(1:n) ./ real - 1).^2)) * 100; trapRms = sqrt(mean((y(n+1:end) - trap).^2, 'omitnan'));
  end
  [fitLap, fitTrap] = sim([]);
  fprintf('fitted car (no limit): lap RMS %.3f %%, trap RMS %.1f km/h\n', fitLap, fitTrap);
  opts = optimoptions('fmincon', 'Display', 'off', 'FiniteDifferenceStepSize', 1e-3, 'MaxFunctionEvaluations', 300);
  nonl = @(x) deal([x(2) - ldMax * x(3); second(@sim, x) - (fitTrap + 2)], []);
  best = inf; rng(1);
  for k = 1:6
    x0 = lb + rand(1, 3) .* (ub - lb); x0(2) = min(x0(2), ldMax * x0(3));
    [x, f, flag] = fmincon(@(x) sim(x), x0, [], [], [], [], lb, ub, nonl, opts);
    [~, tr] = sim(x);
    fprintf('start %d: lap RMS %.3f %%, trap RMS %.1f, muY %.3f clA %.2f cdA %.3f, L/D %.2f, exit %d\n', k, f, tr, x, x(2) / x(3), flag);
    if flag > 0 && f < best, best = f; end
  end
  fprintf('best with L/D <= %g: lap RMS %.3f %% (unlimited fitted car %.3f %%)\n', ldMax, best, fitLap);
end
function v = second(f, x), [~, v] = f(x); end
function v = double_or_nan(x), if isempty(x), v = NaN; else, v = double(x); end, end
