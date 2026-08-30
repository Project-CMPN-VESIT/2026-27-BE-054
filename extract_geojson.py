import json
with open(r'c:\Users\ajayl\OneDrive\Desktop\captsone\final_project\flood-dashboard\backend\data\india_districts_simplified.geojson', 'r') as f:
    data = json.load(f)
    
features = data.get('features', [])
print(f'Total features: {len(features)}')

# Group by state
states = {}
for feat in features:
    props = feat.get('properties', {})
    state = props.get('state', 'UNKNOWN')
    district = props.get('district', 'UNKNOWN')
    if state not in states:
        states[state] = []
    states[state].append(district)

print(f'\nTotal states: {len(states)}')
print(f'\nMAHARASHTRA districts ({len(states.get("MAHARASHTRA", []))}):')
for d in sorted(states.get('MAHARASHTRA', [])):
    print(f'  - {d}')

# Check for Mumbai and Ahmadnagar specifically
maharashtra_dists = [d.upper() for d in states.get('MAHARASHTRA', [])]
print(f'\nMUMBAI in GeoJSON: {"MUMBAI" in maharashtra_dists}')
print(f'AHMADNAGAR in GeoJSON: {"AHMADNAGAR" in maharashtra_dists}')
