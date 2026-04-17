import ROLE_DATA, { attackLevels, defenseLevels, getRoles, getRole } from '../roles';

describe('attack/defense level constants', () => {
  test('attack levels are ordered', () => {
    expect(attackLevels.none).toBeLessThan(attackLevels.basic);
    expect(attackLevels.basic).toBeLessThan(attackLevels.powerful);
    expect(attackLevels.powerful).toBeLessThan(attackLevels.unstoppable);
  });

  test('defense levels are ordered', () => {
    expect(defenseLevels.none).toBeLessThan(defenseLevels.basic);
    expect(defenseLevels.basic).toBeLessThan(defenseLevels.powerful);
    expect(defenseLevels.powerful).toBeLessThan(defenseLevels.invincible);
  });
});

describe('ROLE_DATA shape', () => {
  test('every role has required fields', () => {
    ROLE_DATA.forEach((role) => {
      expect(role).toMatchObject({
        key: expect.any(String),
        team: expect.stringMatching(/^(town|mafia|neutral|evil)$/),
        category: expect.any(String),
        couleur: expect.stringMatching(/^#/),
        icon: expect.any(String),
        actions: expect.any(Array),
        attackLevel: expect.any(Number),
        defenseLevel: expect.any(Number),
      });
    });
  });

  test('keys are unique', () => {
    const keys = ROLE_DATA.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('Vigilante balance', () => {
  test('vigilante is a town killer with 2 shots total', () => {
    const vigilante = ROLE_DATA.find((r) => r.key === 'vigilante');
    expect(vigilante).toBeDefined();
    expect(vigilante.team).toBe('town');
    expect(vigilante.attackLevel).toBe(1);
    const shoot = vigilante.actions.find((a) => a.type === 'VIGILANTE_KILL');
    expect(shoot).toBeDefined();
    expect(shoot.maxUses).toBe(2);
  });
});

describe('Jailor mechanics', () => {
  test('jailor has JAIL (day) + JAILOR_EXECUTE (night) with 3 uses', () => {
    const jailor = ROLE_DATA.find((r) => r.key === 'jailor');
    const jail = jailor.actions.find((a) => a.type === 'JAIL');
    const exec = jailor.actions.find((a) => a.type === 'JAILOR_EXECUTE');
    expect(jail.require).toContain('isDay');
    expect(exec.require).toContain('isNight');
    expect(exec.maxUses).toBe(3);
    expect(exec.targets).toBe('jailed');
  });
});

describe('Mafia roles', () => {
  test('godfather has basic defense and is night immune', () => {
    const gf = ROLE_DATA.find((r) => r.key === 'godfather');
    expect(gf.defenseLevel).toBeGreaterThanOrEqual(1);
    expect(gf.nightImmune).toBe(true);
    expect(gf.unique).toBe(true);
  });

  test('mafia roles are all detected as suspect except godfather', () => {
    const mafia = ROLE_DATA.filter((r) => r.team === 'mafia');
    const gf = mafia.find((r) => r.key === 'godfather');
    expect(gf.detectResult).toBe('non-suspect');
    mafia
      .filter((r) => r.key !== 'godfather')
      .forEach((r) => expect(r.detectResult).toBe('suspect'));
  });
});

describe('Serial Killer', () => {
  test('is a night-immune killer with lastStanding win condition', () => {
    const sk = ROLE_DATA.find((r) => r.key === 'serial_killer');
    expect(sk.team).toBe('neutral');
    expect(sk.nightImmune).toBe(true);
    expect(sk.defenseLevel).toBeGreaterThanOrEqual(1);
    expect(sk.winCondition).toBe('lastStanding');
    expect(sk.attackLevel).toBeGreaterThanOrEqual(1);
  });
});

describe('Neutral roles win conditions', () => {
  test('jester wins by getting lynched', () => {
    expect(ROLE_DATA.find((r) => r.key === 'jester').winCondition).toBe('getLynched');
  });
  test('survivor wins by surviving', () => {
    expect(ROLE_DATA.find((r) => r.key === 'survivor').winCondition).toBe('survive');
  });
  test('executioner wins by getting target lynched', () => {
    expect(ROLE_DATA.find((r) => r.key === 'executioner').winCondition).toBe('getTargetLynched');
  });
});

describe('getRole / getRoles', () => {
  test('getRole returns null for unknown key', () => {
    expect(getRole('unknown_role')).toBeNull();
  });

  test('getRole returns a role with translated fields', () => {
    const sheriff = getRole('sheriff');
    expect(sheriff).toBeDefined();
    expect(sheriff.key).toBe('sheriff');
    // label/description may be empty string if i18n not initialized in test
    expect(sheriff).toHaveProperty('label');
    expect(sheriff).toHaveProperty('description');
    expect(sheriff).toHaveProperty('objectif');
  });

  test('getRoles returns same number of roles as ROLE_DATA', () => {
    expect(getRoles().length).toBe(ROLE_DATA.length);
  });
});
