const ROLE_KEYS = {
  receptionist: process.env.RECEPTIONIST_KEY,
  observer: process.env.OBSERVER_KEY,
  safety: process.env.SAFETY_KEY,
};

/**
 * @param {string} role
 * @param {string} key
 * @returns {boolean}
 */

function verify(role, key) {
  return Boolean(ROLE_KEYS[role] && ROLE_KEYS[role] === key);
}

module.exports = { verify };
