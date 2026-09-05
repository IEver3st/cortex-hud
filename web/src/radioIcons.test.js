import { describe, expect, test } from 'bun:test'
import { RADIO_STATION_ICON_COUNT, getRadioStationIconUrl } from './radioIcons.js'

describe('radio station icons', () => {
  test('maps every configured GTA V station to a local asset', () => {
    expect(RADIO_STATION_ICON_COUNT).toBe(27)
    expect(getRadioStationIconUrl('RADIO_01_CLASS_ROCK')).toBe('./radio-icons/RADIO_01_CLASS_ROCK.png')
    expect(getRadioStationIconUrl('radio_19_user')).toBe('./radio-icons/RADIO_19_USER.svg')
    expect(getRadioStationIconUrl('RADIO_36_AUDIOPLAYER')).toBe('./radio-icons/RADIO_36_AUDIOPLAYER.png')
  })

  test('does not invent artwork for on-demand tracks or malformed IDs', () => {
    expect(getRadioStationIconUrl('radio_track:1088:0')).toBeNull()
    expect(getRadioStationIconUrl(null)).toBeNull()
  })
})
