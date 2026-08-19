const PLACE = (primary, secondary, icon, tone) => ({ primary, secondary, icon, tone })

const ZONE_PLACES = {
  DOWNT: PLACE('Downtown', 'Los Santos', 'city', 'pink'),
  PBOX: PLACE('Pillbox Hill', 'Downtown', 'city', 'pink'),
  LEGSQU: PLACE('Legion Square', 'Downtown', 'city', 'pink'),
  KOREAT: PLACE('Little Seoul', 'West Los Santos', 'city', 'teal'),
  DTVINE: PLACE('Downtown Vinewood', 'Vinewood', 'city', 'purple'),
  VINE: PLACE('Vinewood', 'Los Santos', 'palm', 'pink'),
  WVINE: PLACE('West Vinewood', 'Los Santos', 'palm', 'pink'),
  EAST_V: PLACE('East Vinewood', 'Los Santos', 'city', 'purple'),
  ROCKF: PLACE('Rockford Hills', 'Los Santos', 'city', 'purple'),
  BURTON: PLACE('Burton', 'North Los Santos', 'city', 'purple'),
  HAWICK: PLACE('Hawick', 'North Los Santos', 'city', 'purple'),
  RICHM: PLACE('Richman', 'Los Santos', 'neighborhood', 'yellow'),
  VESP: PLACE('Vespucci', 'Pacific Coast', 'palm', 'pink'),
  VCANA: PLACE('Vespucci Canals', 'West Los Santos', 'palm', 'teal'),
  DELPE: PLACE('Del Perro', 'West Los Santos', 'palm', 'pink'),
  DELBE: PLACE('Del Perro Beach', 'Pacific Coast', 'palm', 'pink'),
  MIRR: PLACE('Mirror Park', 'East Los Santos', 'neighborhood', 'teal'),
  SKID: PLACE('Mission Row', 'Downtown', 'city', 'blue'),
  STRAW: PLACE('Strawberry', 'South Los Santos', 'neighborhood', 'coral'),
  DAVIS: PLACE('Davis', 'South Los Santos', 'neighborhood', 'coral'),
  CHAMH: PLACE('Chamberlain Hills', 'South Los Santos', 'neighborhood', 'coral'),
  RANCHO: PLACE('Rancho', 'South Los Santos', 'neighborhood', 'coral'),
  LMESA: PLACE('La Mesa', 'East Los Santos', 'industrial', 'blue'),
  CYPRE: PLACE('Cypress Flats', 'East Los Santos', 'industrial', 'blue'),
  EBURO: PLACE('El Burro Heights', 'East Los Santos', 'industrial', 'blue'),
  ELYSIAN: PLACE('Elysian Island', 'Port of Los Santos', 'industrial', 'blue'),
  TERMINA: PLACE('Terminal', 'Port of Los Santos', 'industrial', 'blue'),
  TERMINAL: PLACE('Terminal', 'Port of Los Santos', 'industrial', 'blue'),
  ZP_ORT: PLACE('South Los Santos Port', 'Los Santos', 'industrial', 'blue'),
  AIRP: PLACE('Los Santos International', 'Airport', 'city', 'blue'),
  SANDY: PLACE('Sandy Shores', 'Blaine County', 'desert', 'yellow'),
  GRAPES: PLACE('Grapeseed', 'Blaine County', 'rural', 'teal'),
  HARMO: PLACE('Harmony', 'Blaine County', 'desert', 'yellow'),
  PALETO: PLACE('Paleto Bay', 'Blaine County', 'rural', 'teal'),
  CHU: PLACE('Chumash', 'Pacific Coast', 'palm', 'teal'),
  NCHU: PLACE('North Chumash', 'Pacific Coast', 'palm', 'teal'),
  ARMYB: PLACE('Fort Zancudo', 'Blaine County', 'industrial', 'blue'),
  JAIL: PLACE('Bolingbroke Penitentiary', 'Blaine County', 'industrial', 'coral'),
  DESRT: PLACE('Grand Senora Desert', 'Blaine County', 'desert', 'yellow'),
  GREATC: PLACE('Great Chaparral', 'Blaine County', 'rural', 'yellow'),
  MTCHIL: PLACE('Mount Chiliad', 'San Andreas', 'mountain', 'blue'),
  BHAMCA: PLACE('Banham Canyon', 'Los Santos County', 'mountain', 'yellow'),
  CANNY: PLACE('Raton Canyon', 'Blaine County', 'mountain', 'blue'),
  TONGVAH: PLACE('Tongva Hills', 'Los Santos County', 'mountain', 'yellow'),
  TONGVAV: PLACE('Tongva Valley', 'Los Santos County', 'mountain', 'yellow'),
  ZANCUDO: PLACE('Zancudo River', 'Blaine County', 'rural', 'blue'),
  SANCHIA: PLACE('San Chianski Range', 'Blaine County', 'mountain', 'blue'),
}

const STREET_PLACES = [
  { aliases: ['FORUM DR', 'FORUM DRIVE'], place: PLACE('Forum Drive', 'South Los Santos', 'neighborhood', 'pink') },
  { aliases: ['GROVE ST', 'GROVE STREET'], place: PLACE('Grove Street', 'South Los Santos', 'neighborhood', 'teal') },
  { aliases: ['VINEWOOD BLVD', 'VINEWOOD BOULEVARD'], place: PLACE('Vinewood Boulevard', 'Vinewood', 'palm', 'pink') },
  { aliases: ['ECLIPSE BLVD', 'ECLIPSE BOULEVARD'], place: PLACE('Eclipse Boulevard', 'West Vinewood', 'city', 'purple') },
  { aliases: ['MIRROR PARK BLVD', 'MIRROR PARK BOULEVARD'], place: PLACE('Mirror Park Boulevard', 'Mirror Park', 'neighborhood', 'teal') },
  { aliases: ['ROUTE 68'], place: PLACE('Route 68', 'Blaine County', 'desert', 'yellow') },
  { aliases: ['GREAT OCEAN HWY', 'GREAT OCEAN HIGHWAY'], place: PLACE('Great Ocean Highway', 'Pacific Coast', 'palm', 'blue') },
]

function normalize(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

const STREET_INDEX = new Map()
for (const rule of STREET_PLACES) {
  for (const alias of rule.aliases) {
    STREET_INDEX.set(alias, rule.place)
  }
}

const ZONE_LABEL_INDEX = new Map(
  Object.entries(ZONE_PLACES).map(([code, place]) => [normalize(place.primary), { code, place }]),
)

export function resolveGta5Place({ street, zone, zoneCode }) {
  const normalizedStreet = normalize(street)
  const normalizedZoneCode = normalize(zoneCode)
  const zoneEntry = ZONE_PLACES[normalizedZoneCode]
    ? { code: normalizedZoneCode, place: ZONE_PLACES[normalizedZoneCode] }
    : ZONE_LABEL_INDEX.get(normalize(zone))

  const streetPlace = STREET_INDEX.get(normalizedStreet)
  if (streetPlace) {
    return {
      ...streetPlace,
      id: `street:${normalizedStreet}`,
      secondary: zoneEntry?.place.primary || streetPlace.secondary,
    }
  }

  if (!zoneEntry) return null

  return {
    ...zoneEntry.place,
    id: `zone:${zoneEntry.code}`,
  }
}

export const GTA5_DISTINCT_PLACE_COUNT = Object.keys(ZONE_PLACES).length + STREET_PLACES.length
