/**
 * Constants — dispatch centers, state data.
 */

export const DISPATCH_CENTERS = {
  BIHAR: [
    { name: 'Patna SDRF HQ', lat: 25.61, lon: 85.14 },
    { name: 'Muzaffarpur Regional', lat: 26.12, lon: 85.37 },
    { name: 'Gaya Base Camp', lat: 24.78, lon: 85.00 },
    { name: 'Bhagalpur East', lat: 25.25, lon: 86.98 },
    { name: 'Darbhanga North', lat: 26.15, lon: 85.90 },
  ],
  MAHARASHTRA: [
    { name: 'Mumbai NDRF', lat: 19.07, lon: 72.87 },
    { name: 'Pune Regional HQ', lat: 18.52, lon: 73.85 },
    { name: 'Nagpur East Base', lat: 21.14, lon: 79.08 },
    { name: 'Aurangabad Center', lat: 19.87, lon: 75.34 },
    { name: 'Nashik Camp', lat: 19.99, lon: 73.78 },
  ],
  ASSAM: [
    { name: 'Guwahati SDRF', lat: 26.14, lon: 91.74 },
    { name: 'Dibrugarh Base', lat: 27.48, lon: 94.91 },
    { name: 'Silchar South', lat: 24.83, lon: 92.80 },
    { name: 'Jorhat Camp', lat: 26.75, lon: 94.22 },
    { name: 'Tezpur Regional', lat: 26.63, lon: 92.79 },
  ],
  'UTTAR PRADESH': [
    { name: 'Lucknow SDRF HQ', lat: 26.85, lon: 80.95 },
    { name: 'Varanasi Base', lat: 25.32, lon: 82.97 },
    { name: 'Gorakhpur Camp', lat: 26.76, lon: 83.37 },
    { name: 'Allahabad Center', lat: 25.45, lon: 81.84 },
    { name: 'Agra Regional', lat: 27.18, lon: 78.01 },
  ],
  'WEST BENGAL': [
    { name: 'Kolkata NDRF', lat: 22.57, lon: 88.36 },
    { name: 'Siliguri North', lat: 26.71, lon: 88.43 },
    { name: 'Asansol West', lat: 23.68, lon: 86.98 },
    { name: 'Midnapore Base', lat: 22.42, lon: 87.32 },
    { name: 'Malda Camp', lat: 25.00, lon: 88.14 },
  ],
  ODISHA: [
    { name: 'Bhubaneswar HQ', lat: 20.30, lon: 85.82 },
    { name: 'Cuttack Base', lat: 20.46, lon: 85.88 },
    { name: 'Berhampur Regional', lat: 19.31, lon: 84.79 },
    { name: 'Sambalpur Camp', lat: 21.47, lon: 83.98 },
    { name: 'Rourkela North', lat: 22.26, lon: 84.85 },
  ],
  GUJARAT: [
    { name: 'Gandhinagar HQ', lat: 23.22, lon: 72.64 },
    { name: 'Ahmedabad NDRF', lat: 23.02, lon: 72.57 },
    { name: 'Surat Regional', lat: 21.17, lon: 72.83 },
    { name: 'Rajkot Camp', lat: 22.30, lon: 70.80 },
    { name: 'Vadodara Base', lat: 22.31, lon: 73.19 },
  ],
  KERALA: [
    { name: 'Thiruvananthapuram HQ', lat: 8.52, lon: 76.94 },
    { name: 'Kochi NDRF', lat: 9.93, lon: 76.26 },
    { name: 'Kozhikode Camp', lat: 11.25, lon: 75.77 },
  ],
};

// State capitals for states not in DISPATCH_CENTERS (fallback)
export const STATE_CAPITALS = {
  RAJASTHAN: { lat: 26.91, lon: 75.79 },
  'MADHYA PRADESH': { lat: 23.26, lon: 77.41 },
  'ANDHRA PRADESH': { lat: 16.51, lon: 80.65 },
  TELANGANA: { lat: 17.39, lon: 78.49 },
  PUNJAB: { lat: 30.73, lon: 76.78 },
  HARYANA: { lat: 30.73, lon: 76.78 },
  'HIMACHAL PRADESH': { lat: 31.10, lon: 77.17 },
  'JAMMU & KASHMIR': { lat: 34.08, lon: 74.80 },
  UTTARAKHAND: { lat: 30.32, lon: 78.03 },
  JHARKHAND: { lat: 23.34, lon: 85.31 },
  CHHATTISGARH: { lat: 21.25, lon: 81.63 },
  'TAMIL NADU': { lat: 13.08, lon: 80.27 },
  KARNATAKA: { lat: 12.97, lon: 77.59 },
  GOA: { lat: 15.49, lon: 73.83 },
  DELHI: { lat: 28.70, lon: 77.10 },
  MANIPUR: { lat: 24.82, lon: 93.94 },
  NAGALAND: { lat: 25.68, lon: 94.11 },
  MEGHALAYA: { lat: 25.58, lon: 91.89 },
  TRIPURA: { lat: 23.94, lon: 91.99 },
  MIZORAM: { lat: 23.16, lon: 92.94 },
  'ARUNACHAL PRADESH': { lat: 27.08, lon: 93.61 },
  SIKKIM: { lat: 27.34, lon: 88.61 },
};

export function getDispatchCenters(state) {
  const key = state?.toUpperCase()?.trim();
  if (DISPATCH_CENTERS[key]) return DISPATCH_CENTERS[key];
  const cap = STATE_CAPITALS[key];
  if (cap) return [{ name: `${state} State HQ`, lat: cap.lat, lon: cap.lon }];
  return [{ name: 'State HQ', lat: 22.0, lon: 78.0 }];
}
