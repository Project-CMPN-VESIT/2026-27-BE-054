import sys, json
d = json.load(sys.stdin)
districts = {x['district']: x for x in d['districts']}

print('MUMBAI:' if 'Mumbai' in districts else 'MUMBAI NOT FOUND')
m = districts.get('Mumbai', {})
print(f"  Latitude: {m.get('latitude')}, Longitude: {m.get('longitude')}")

print('AHMADNAGAR:' if 'Ahmadnagar' in districts else 'AHMADNAGAR NOT FOUND')
a = districts.get('Ahmadnagar', {})
print(f"  Latitude: {a.get('latitude')}, Longitude: {a.get('longitude')}")

print(f"Total districts: {len(d['districts'])}")
