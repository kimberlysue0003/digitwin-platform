// Singapore's 55 Planning Areas with accurate coordinates
// Based on URA Master Plan 2019

export interface PlanningArea {
  id: string;
  name: string;
  region: 'central' | 'north' | 'south' | 'east' | 'west';
  center: [number, number]; // [lat, lng]
  bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
}

export const PLANNING_AREAS: PlanningArea[] = [
  // Central Region
  { id: 'downtown-core', name: 'Downtown Core', region: 'central', center: [1.2806, 103.8507], bounds: [[1.2650, 103.8350], [1.2950, 103.8650]] },
  { id: 'marina-south', name: 'Marina South', region: 'central', center: [1.2644, 103.8632], bounds: [[1.2500, 103.8500], [1.2800, 103.8800]] },
  { id: 'museum', name: 'Museum', region: 'central', center: [1.2967, 103.8489], bounds: [[1.2850, 103.8400], [1.3100, 103.8600]] },
  { id: 'newton', name: 'Newton', region: 'central', center: [1.3138, 103.8388], bounds: [[1.3050, 103.8300], [1.3250, 103.8500]] },
  { id: 'orchard', name: 'Orchard', region: 'central', center: [1.3048, 103.8318], bounds: [[1.2950, 103.8200], [1.3150, 103.8450]] },
  { id: 'outram', name: 'Outram', region: 'central', center: [1.2787, 103.8371], bounds: [[1.2700, 103.8250], [1.2900, 103.8500]] },
  { id: 'river-valley', name: 'River Valley', region: 'central', center: [1.2939, 103.8361], bounds: [[1.2850, 103.8250], [1.3050, 103.8500]] },
  { id: 'rochor', name: 'Rochor', region: 'central', center: [1.3032, 103.8526], bounds: [[1.2950, 103.8400], [1.3150, 103.8650]] },
  { id: 'singapore-river', name: 'Singapore River', region: 'central', center: [1.2870, 103.8489], bounds: [[1.2800, 103.8400], [1.2950, 103.8600]] },
  { id: 'straits-view', name: 'Straits View', region: 'central', center: [1.2897, 103.8607], bounds: [[1.2850, 103.8550], [1.2950, 103.8700]] },
  { id: 'tanglin', name: 'Tanglin', region: 'central', center: [1.3048, 103.8145], bounds: [[1.2950, 103.8000], [1.3150, 103.8300]] },

  // North Region
  { id: 'central-water-catchment', name: 'Central Water Catchment', region: 'north', center: [1.3840, 103.8050], bounds: [[1.3600, 103.7800], [1.4100, 103.8300]] },
  { id: 'lim-chu-kang', name: 'Lim Chu Kang', region: 'north', center: [1.4300, 103.7174], bounds: [[1.4100, 103.6900], [1.4500, 103.7450]] },
  { id: 'mandai', name: 'Mandai', region: 'north', center: [1.4102, 103.7890], bounds: [[1.3950, 103.7700], [1.4250, 103.8100]] },
  { id: 'sembawang', name: 'Sembawang', region: 'north', center: [1.4491, 103.8185], bounds: [[1.4350, 103.8000], [1.4650, 103.8400]] },
  { id: 'simpang', name: 'Simpang', region: 'north', center: [1.4250, 103.7800], bounds: [[1.4150, 103.7650], [1.4350, 103.7950]] },
  { id: 'sungei-kadut', name: 'Sungei Kadut', region: 'north', center: [1.4130, 103.7500], bounds: [[1.4000, 103.7350], [1.4250, 103.7650]] },
  { id: 'woodlands', name: 'Woodlands', region: 'north', center: [1.4382, 103.7891], bounds: [[1.4200, 103.7700], [1.4550, 103.8100]] },
  { id: 'yishun', name: 'Yishun', region: 'north', center: [1.4304, 103.8354], bounds: [[1.4150, 103.8200], [1.4450, 103.8500]] },

  // Northeast Region
  { id: 'ang-mo-kio', name: 'Ang Mo Kio', region: 'north', center: [1.3691, 103.8454], bounds: [[1.3550, 103.8300], [1.3850, 103.8600]] },
  { id: 'hougang', name: 'Hougang', region: 'north', center: [1.3612, 103.8864], bounds: [[1.3450, 103.8700], [1.3800, 103.9050]] },
  { id: 'north-eastern-islands', name: 'North-Eastern Islands', region: 'north', center: [1.4100, 103.9600], bounds: [[1.3900, 103.9400], [1.4300, 103.9800]] },
  { id: 'punggol', name: 'Punggol', region: 'north', center: [1.4048, 103.9022], bounds: [[1.3900, 103.8850], [1.4200, 103.9200]] },
  { id: 'seletar', name: 'Seletar', region: 'north', center: [1.4050, 103.8691], bounds: [[1.3900, 103.8550], [1.4200, 103.8850]] },
  { id: 'sengkang', name: 'Sengkang', region: 'north', center: [1.3868, 103.8914], bounds: [[1.3700, 103.8750], [1.4050, 103.9100]] },
  { id: 'serangoon', name: 'Serangoon', region: 'north', center: [1.3554, 103.8732], bounds: [[1.3400, 103.8600], [1.3700, 103.8900]] },

  // East Region
  { id: 'bedok', name: 'Bedok', region: 'east', center: [1.3236, 103.9273], bounds: [[1.3100, 103.9100], [1.3400, 103.9450]] },
  { id: 'changi', name: 'Changi', region: 'east', center: [1.3644, 103.9915], bounds: [[1.3500, 103.9700], [1.3800, 104.0150]] },
  { id: 'changi-bay', name: 'Changi Bay', region: 'east', center: [1.3900, 104.0200], bounds: [[1.3750, 104.0000], [1.4050, 104.0400]] },
  { id: 'geylang', name: 'Geylang', region: 'east', center: [1.3201, 103.8918], bounds: [[1.3050, 103.8750], [1.3350, 103.9100]] },
  { id: 'marine-parade', name: 'Marine Parade', region: 'east', center: [1.3020, 103.9062], bounds: [[1.2900, 103.8900], [1.3150, 103.9250]] },
  { id: 'pasir-ris', name: 'Pasir Ris', region: 'east', center: [1.3721, 103.9474], bounds: [[1.3600, 103.9300], [1.3850, 103.9650]] },
  { id: 'paya-lebar', name: 'Paya Lebar', region: 'east', center: [1.3587, 103.9140], bounds: [[1.3450, 103.9000], [1.3750, 103.9300]] },
  { id: 'tampines', name: 'Tampines', region: 'east', center: [1.3496, 103.9568], bounds: [[1.3350, 103.9400], [1.3650, 103.9750]] },

  // West Region
  { id: 'boon-lay', name: 'Boon Lay', region: 'west', center: [1.3390, 103.7014], bounds: [[1.3250, 103.6850], [1.3550, 103.7200]] },
  { id: 'bukit-batok', name: 'Bukit Batok', region: 'west', center: [1.3590, 103.7467], bounds: [[1.3450, 103.7300], [1.3750, 103.7650]] },
  { id: 'bukit-panjang', name: 'Bukit Panjang', region: 'west', center: [1.3774, 103.7718], bounds: [[1.3600, 103.7550], [1.3950, 103.7900]] },
  { id: 'choa-chu-kang', name: 'Choa Chu Kang', region: 'west', center: [1.3840, 103.7470], bounds: [[1.3700, 103.7300], [1.4000, 103.7650]] },
  { id: 'clementi', name: 'Clementi', region: 'west', center: [1.3162, 103.7649], bounds: [[1.3000, 103.7500], [1.3350, 103.7800]] },
  { id: 'jurong-east', name: 'Jurong East', region: 'west', center: [1.3329, 103.7436], bounds: [[1.3150, 103.7250], [1.3500, 103.7650]] },
  { id: 'jurong-west', name: 'Jurong West', region: 'west', center: [1.3404, 103.7090], bounds: [[1.3250, 103.6900], [1.3600, 103.7300]] },
  { id: 'pioneer', name: 'Pioneer', region: 'west', center: [1.3152, 103.6752], bounds: [[1.3000, 103.6600], [1.3300, 103.6950]] },
  { id: 'tengah', name: 'Tengah', region: 'west', center: [1.3740, 103.7140], bounds: [[1.3600, 103.6950], [1.3900, 103.7350]] },
  { id: 'tuas', name: 'Tuas', region: 'west', center: [1.3200, 103.6500], bounds: [[1.2950, 103.6200], [1.3450, 103.6800]] },
  { id: 'western-islands', name: 'Western Islands', region: 'west', center: [1.2050, 103.7450], bounds: [[1.1800, 103.7200], [1.2300, 103.7700]] },
  { id: 'western-water-catchment', name: 'Western Water Catchment', region: 'west', center: [1.4050, 103.7050], bounds: [[1.3850, 103.6850], [1.4250, 103.7250]] },

  // South Region (including Central-South areas)
  { id: 'bishan', name: 'Bishan', region: 'central', center: [1.3526, 103.8352], bounds: [[1.3400, 103.8200], [1.3650, 103.8500]] },
  { id: 'bukit-merah', name: 'Bukit Merah', region: 'south', center: [1.2818, 103.8238], bounds: [[1.2650, 103.8050], [1.3000, 103.8450]] },
  { id: 'bukit-timah', name: 'Bukit Timah', region: 'central', center: [1.3294, 103.7978], bounds: [[1.3150, 103.7800], [1.3450, 103.8150]] },
  { id: 'kallang', name: 'Kallang', region: 'central', center: [1.3119, 103.8631], bounds: [[1.2950, 103.8450], [1.3300, 103.8850]] },
  { id: 'novena', name: 'Novena', region: 'central', center: [1.3209, 103.8439], bounds: [[1.3100, 103.8300], [1.3350, 103.8600]] },
  { id: 'queenstown', name: 'Queenstown', region: 'south', center: [1.2942, 103.7861], bounds: [[1.2800, 103.7700], [1.3100, 103.8050]] },
  { id: 'southern-islands', name: 'Southern Islands', region: 'south', center: [1.2300, 103.8400], bounds: [[1.2000, 103.8100], [1.2600, 103.8700]] },
  { id: 'toa-payoh', name: 'Toa Payoh', region: 'central', center: [1.3343, 103.8563], bounds: [[1.3200, 103.8400], [1.3500, 103.8750]] },
];

// Group planning areas by region
export const REGIONS = {
  central: PLANNING_AREAS.filter(pa => pa.region === 'central'),
  north: PLANNING_AREAS.filter(pa => pa.region === 'north'),
  south: PLANNING_AREAS.filter(pa => pa.region === 'south'),
  east: PLANNING_AREAS.filter(pa => pa.region === 'east'),
  west: PLANNING_AREAS.filter(pa => pa.region === 'west'),
};

// Main regions for overview
export const MAIN_REGIONS = [
  { id: 'central', name: 'Central', color: '#f59e0b', center: [1.3000, 103.8300] as [number, number] },
  { id: 'north', name: 'North', color: '#3b82f6', center: [1.4200, 103.8200] as [number, number] },
  { id: 'south', name: 'South', color: '#10b981', center: [1.2800, 103.8100] as [number, number] },
  { id: 'east', name: 'East', color: '#ef4444', center: [1.3400, 103.9400] as [number, number] },
  { id: 'west', name: 'West', color: '#8b5cf6', center: [1.3400, 103.7200] as [number, number] },
];
