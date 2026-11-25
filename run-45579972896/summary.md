# Step 32 polar verdict — run 45579972896

- run: https://github.com/kangjeongmin1229/f1-data-analyst-deploy/actions/runs/45579972896
- commit: 7e06a6bf19807c1ff16f5db1aa4aba199fb9cd65
- run conclusion: success
- jobs failed: 0
- verdict: **FAIL**

```json
{
  "verdict": "FAIL",
  "primary": null,
  "guards": {
    "G_P": {
      "n_checks": 600,
      "fails": [
        {
          "held": "imola",
          "season": "2024",
          "P1": true,
          "P2": true,
          "P4": true,
          "GBT": true,
          "PL": false
        },
        {
          "held": "las-vegas",
          "season": "2024",
          "P1": true,
          "P2": true,
          "P4": true,
          "GBT": true,
          "PL": false
        },
        {
          "held": "melbourne",
          "season": "2024",
          "P1": true,
          "P2": true,
          "P4": true,
          "GBT": true,
          "PL": false
        },
        {
          "held": "mexico-city",
          "season": "2025",
          "P1": true,
          "P2": true,
          "P4": true,
          "GBT": true,
          "PL": false
        },
        {
          "held": "monte-carlo",
          "season": "2024",
          "P1": true,
          "P2": true,
          "P4": true,
          "GBT": true,
          "PL": false
        },
        {
          "held": "monte-carlo",
          "season": "2025",
          "P1": true,
          "P2": true,
          "P4": true,
          "GBT": true,
          "PL": false
        },
        {
          "held": "montreal",
          "season": "2024",
          "P1": true,
          "P2": true,
          "P4": true,
          "GBT": true,
          "PL": false
        },
        {
          "held": "sakhir",
          "season": "2024",
          "P1": true,
          "P2": true,
          "P4": true,
          "GBT": true,
          "PL": false
        },
        {
          "held": "suzuka",
          "season": "2025",
          "P1": true,
          "P2": true,
          "P4": true,
          "GBT": false,
          "PL": true
        },
        {
          "held": "zandvoort",
          "season": "2024",
          "P1": true,
          "P2": true,
          "P4": true,
          "GBT": true,
          "PL": false
        }
      ],
      "n_fails": 10,
      "pass_": false
    },
    "G_mesh": {
      "pass_": true
    },
    "G_S": {
      "pass_": true
    },
    "G_T": {
      "off_ms": 2497.6852409999997,
      "on_ms": 2582.9591849999997,
      "laps": 40,
      "ratio": 1.0341411890498495,
      "pass": true,
      "pass_": true
    },
    "G_M0": {
      "pass_": true
    },
    "G_SB": {
      "mean_kph": 1.4974124043876558,
      "ci95": [
        -0.844969588661945,
        3.56321097276514
      ],
      "base_mean_kph": 0.6539712610365118,
      "base_ci95": [
        -1.794498343990741,
        3.007391314956608
      ],
      "pass_": false
    },
    "G_TR": {
      "bins": [
        {
          "bin": 80,
          "meas_g": 1.0884403669724765,
          "meas_ci95": [
            1.012334352701325,
            1.1430173292558612
          ],
          "cand_g": 1.0505606523955149,
          "base_g": 1.244138634046891,
          "ok": true
        },
        {
          "bin": 100,
          "meas_g": 1.337920489296636,
          "meas_ci95": [
            1.2813778032619776,
            1.4168100152905199
          ],
          "cand_g": 1.2743679918450557,
          "base_g": 1.4929153924566767,
          "ok": false
        },
        {
          "bin": 120,
          "meas_g": 1.5398572884811417,
          "meas_ci95": [
            1.4806817023445464,
            1.6053455657492355
          ],
          "cand_g": 1.4568705402650355,
          "base_g": 1.6202650356778796,
          "ok": false
        },
        {
          "bin": 140,
          "meas_g": 1.5739041794087665,
          "meas_ci95": [
            1.5337731906218144,
            1.6008203363914373
          ],
          "cand_g": 1.5035219164118245,
          "base_g": 1.5546788990825688,
          "ok": false
        },
        {
          "bin": 160,
          "meas_g": 1.4551376146788988,
          "meas_ci95": [
            1.4225128695208968,
            1.4852268093781855
          ],
          "cand_g": 1.4305810397553518,
          "base_g": 1.3422018348623852,
          "ok": true
        },
        {
          "bin": 180,
          "meas_g": 1.2568297655453617,
          "meas_ci95": [
            1.2274199796126402,
            1.2847993119266052
          ],
          "cand_g": 1.2269622833843017,
          "base_g": 1.1204892966360858,
          "ok": false
        },
        {
          "bin": 200,
          "meas_g": 1.0657084607543321,
          "meas_ci95": [
            1.0403669724770641,
            1.088204001019368
          ],
          "cand_g": 1.0202854230377165,
          "base_g": 0.9336391437308869,
          "ok": false
        },
        {
          "bin": 220,
          "meas_g": 0.8714271151885827,
          "meas_ci95": [
            0.8424030326197757,
            0.9027150866462792
          ],
          "cand_g": 0.8326197757390417,
          "base_g": 0.7719673802242609,
          "ok": false
        }
      ],
      "pass_": false
    }
  }
}
```
