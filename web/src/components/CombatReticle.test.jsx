import React from 'react'
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import CombatReticle from './CombatReticle.jsx'

describe('combat reticle', () => {
  test('uses the bloom-driven ring for automatic weapons', () => {
    const loose = renderToStaticMarkup(
      <CombatReticle showAuthenticReticle weaponReticleType="automatic" weaponBloom={80} weaponAiming />,
    )
    const tight = renderToStaticMarkup(
      <CombatReticle showAuthenticReticle weaponReticleType="automatic" weaponBloom={20} weaponAiming />,
    )

    expect(loose).toContain('combat-reticle-ring')
    expect(loose).toContain('--combat-reticle-diameter:17.8px')
    expect(tight).toContain('--combat-reticle-diameter:11.2px')
    expect(tight).not.toContain('combat-reticle-open')
  })

  test('hides every reticle outside ADS without suppressing hitmarkers', () => {
    for (const weaponReticleType of ['automatic', 'single', 'tazer', 'rpg', 'homing']) {
      const hidden = renderToStaticMarkup(
        <CombatReticle showAuthenticReticle weaponReticleType={weaponReticleType} weaponBloom={20} />,
      )

      expect(hidden).toBe('')
    }

    const hiddenDot = renderToStaticMarkup(
      <CombatReticle showClassicDot weaponBloom={20} />,
    )

    expect(hiddenDot).toBe('')

    const hit = renderToStaticMarkup(
      <CombatReticle
        showAuthenticReticle
        weaponReticleType="automatic"
        weaponBloom={20}
        hitmarker={{ kind: 'regular', nonce: 1 }}
      />,
    )

    expect(hit).not.toContain('combat-reticle-ring')
    expect(hit).toContain('combat-hitmarker--regular')
  })

  test('uses a dynamic three-line reticle for single-fire and semi-automatic weapons', () => {
    const tight = renderToStaticMarkup(
      <CombatReticle showAuthenticReticle weaponReticleType="single" weaponBloom={20} weaponAiming />,
    )
    const loose = renderToStaticMarkup(
      <CombatReticle showAuthenticReticle weaponReticleType="single" weaponBloom={80} weaponAiming />,
    )

    expect(tight).toContain('combat-reticle-open')
    expect(tight).toContain('--combat-reticle-gap:3.8px')
    expect(loose).toContain('--combat-reticle-gap:6.2px')
    expect(loose.match(/class="combat-reticle-open__arm /g)).toHaveLength(3)
    expect(loose).not.toContain('combat-reticle-ring')
  })

  test('keeps shotgun rings slightly larger while preserving bloom', () => {
    const automatic = renderToStaticMarkup(
      <CombatReticle showAuthenticReticle weaponReticleType="automatic" weaponBloom={50} weaponAiming />,
    )
    const shotgun = renderToStaticMarkup(
      <CombatReticle showAuthenticReticle weaponReticleType="shotgun" weaponBloom={50} weaponAiming />,
    )

    expect(automatic).toContain('--combat-reticle-diameter:14.5px')
    expect(shotgun).toContain('combat-reticle-ring--shotgun')
    expect(shotgun).toContain('--combat-reticle-diameter:18.5px')
  })

  test('renders dedicated heavy reticles only while aiming', () => {
    const tazerTight = renderToStaticMarkup(
      <CombatReticle showAuthenticReticle weaponReticleType="tazer" weaponBloom={20} weaponAiming />,
    )
    const tazerLoose = renderToStaticMarkup(
      <CombatReticle showAuthenticReticle weaponReticleType="tazer" weaponBloom={80} weaponAiming />,
    )
    const rpgTight = renderToStaticMarkup(
      <CombatReticle showAuthenticReticle weaponReticleType="rpg" weaponBloom={20} weaponAiming />,
    )
    const rpgLoose = renderToStaticMarkup(
      <CombatReticle showAuthenticReticle weaponReticleType="rpg" weaponBloom={80} weaponAiming />,
    )

    expect(tazerTight).toContain('combat-reticle-tazer')
    expect(tazerTight).toContain('--combat-reticle-diameter:9.2px')
    expect(tazerLoose).toContain('--combat-reticle-diameter:12.8px')
    expect(tazerTight.match(/<path/g)).toHaveLength(8)
    expect(tazerTight).not.toContain('combat-reticle-ring')
    expect(tazerTight).not.toContain('__dot')
    expect(rpgTight).toContain('combat-reticle-ring--rpg')
    expect(rpgTight).toContain('--combat-reticle-diameter:18.2px')
    expect(rpgLoose).toContain('--combat-reticle-diameter:24.8px')
    expect(rpgTight).not.toContain('__tick')
    expect(rpgTight).not.toContain('__dot')
  })

  test('homing launcher defers to the vanilla lock-on UI', () => {
    const aiming = renderToStaticMarkup(
      <CombatReticle showAuthenticReticle weaponReticleType="homing" weaponBloom={20} weaponAiming />,
    )
    const aimingLoose = renderToStaticMarkup(
      <CombatReticle showAuthenticReticle weaponReticleType="homing" weaponBloom={80} weaponAiming />,
    )
    const classicDot = renderToStaticMarkup(
      <CombatReticle showClassicDot weaponReticleType="homing" weaponBloom={20} weaponAiming />,
    )

    expect(aiming).toBe('')
    expect(aimingLoose).toBe('')
    expect(classicDot).toBe('')

    const hit = renderToStaticMarkup(
      <CombatReticle
        showAuthenticReticle
        weaponReticleType="homing"
        weaponBloom={20}
        weaponAiming
        hitmarker={{ kind: 'regular', nonce: 1 }}
      />,
    )

    expect(hit).toContain('combat-hitmarker--regular')
    expect(hit).not.toContain('combat-reticle-ring')
    expect(hit).not.toContain('combat-reticle-homing')
  })

  test('renders each semantic hitmarker with a distinct class', () => {
    for (const kind of ['regular', 'knockout', 'critical', 'vehicle']) {
      const markup = renderToStaticMarkup(
        <CombatReticle hitmarker={{ kind, nonce: 1 }} />,
      )

      expect(markup).toContain(`combat-hitmarker--${kind}`)
      expect(markup.match(/<path/g)).toHaveLength(8)
    }
  })
})
