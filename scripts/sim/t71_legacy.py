"""Decode legacy Timing71 arrays without inventing discarded lap fields.

Wire layout verified against timing71/livetiming-core commit
ae85b4e386e4ce331a24a02a5faff9263f674128: analysis/data.py (Lap.for_json,
Car.for_json), analysis/__init__.py (map_stint_with), racing.py (FlagStatus).
"""
FLAGS = dict(enumerate(('none', 'green', 'white', 'chequered', 'yellow', 'fcy',
                        'code_60', 'vsc', 'sc', 'caution', 'red', 'slow_zone', 'code_60_zone')))


def decode(data):
    if not isinstance(data.get('static'), dict) or not isinstance(data.get('stint'), dict):
        raise ValueError('legacy static/stint dictionaries missing')
    cars = {}
    issues = []
    for number in sorted(set(data['static']) | set(data['stint'])):
        row = data['static'].get(number)
        if not isinstance(row, list) or len(row) != 3:
            issues.append({'car': number, 'reason': 'invalid_static_row'})
            row = [None, None, None]
        car = {'raceNum': number, 'raceClass': row[0], 'teamName': row[1], 'make': row[2], 'stints': []}
        cars[number] = car
        stints = data['stint'].get(number, [])
        if not isinstance(stints, list):
            issues.append({'car': number, 'reason': 'invalid_stint_container'})
            continue
        for si, stint in enumerate(stints):
            if not isinstance(stint, list) or len(stint) != 10 or not isinstance(stint[9], list) or not isinstance(stint[4], bool):
                issues.append({'car': number, 'stint': si, 'reason': 'invalid_stint_row'})
                continue
            laps = []
            for li, lap in enumerate(stint[9]):
                if not isinstance(lap, list) or len(lap) != 2:
                    issues.append({'car': number, 'stint': si, 'lap_index': li, 'reason': 'invalid_lap_row'})
                    continue
                flag = lap[1]
                known = isinstance(flag, int) and not isinstance(flag, bool) and flag in FLAGS
                laps.append({'laptime': lap[0], 'flag': FLAGS[flag] if known else 'unknown',
                             'source_flag': flag, 'timestamp': None, 'lapNumber': None,
                             'source_lap_index': li})
            car['stints'].append({'startLap': stint[0], 'startTime': stint[1],
                                  'endLap': stint[2], 'endTime': stint[3],
                                  'in_progress': stint[4], 'driver': stint[5], 'laps': laps,
                                  'source_stint_index': si})
    return {'cars': {'cars': cars}, 'schema': 'legacy_decoded', 'issues': issues,
            'missing_by_format': ['lap_timestamp', 'lap_number', 'lap_tyre'],
            'fit_status': 'not_admitted'}
