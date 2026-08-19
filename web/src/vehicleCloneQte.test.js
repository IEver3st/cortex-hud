import { describe, expect, test } from 'bun:test'
import {
  isVehicleCloneHit,
  normalizeVehicleCloneChallenge,
  vehicleCloneSweepAngle,
} from './vehicleCloneQte.js'

describe('vehicle clone timing challenge', () => {
  test('bounds every client-facing challenge value', () => {
    expect(normalizeVehicleCloneChallenge({
      nonce: 'session-1',
      key: 'keyboard-key-that-is-too-wide',
      rounds: 99,
      roundDuration: -1,
      targetPhase: Infinity,
      hitWindow: 1,
      introDuration: 0,
      interRoundDelay: 9999,
      completionDelay: 'bad',
    })).toEqual({
      nonce: 'session-1',
      key: 'KEYBOARD-KEY',
      rounds: 4,
      roundDuration: 650,
      targetPhase: 0.74,
      hitWindow: 0.24,
      introDuration: 150,
      interRoundDelay: 650,
      completionDelay: 150,
    })
  })

  test('accepts only presses inside the configured center window', () => {
    expect(isVehicleCloneHit(0.70, 0.74, 0.14)).toBe(true)
    expect(isVehicleCloneHit(0.67, 0.74, 0.14)).toBe(true)
    expect(isVehicleCloneHit(0.665, 0.74, 0.14)).toBe(false)
    expect(isVehicleCloneHit(0.82, 0.74, 0.14)).toBe(false)
  })

  test('places the pink sweep on the white mark at the target phase', () => {
    expect(vehicleCloneSweepAngle(0.74, 0.74)).toBe(0)
    expect(vehicleCloneSweepAngle(0.49, 0.74)).toBe(-90)
  })
})
