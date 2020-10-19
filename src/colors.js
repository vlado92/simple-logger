const { colors, styles } = require('./styles');

class Nzu {
  constructor() {
    this.str = [];
    const ref = { ...colors, ...styles };
    const all = Object.keys(ref);
    all.forEach((d) => {
      const obj = {
        [d]: {
          get() {
            this.str.push(ref[[d]]);
            const self = this;
            function b(arg) {
              const reset = `\x1b[${styles.reset[0]}m`;
              const arg2 = self.str
                .slice(0, 1)
                .map((s) => `\x1b[${s[0]}m${arg}\x1b[${s[1]}m`)
                .concat(reset)
                .join();

              self.str = [];
              return arg2;
            }
            Object.setPrototypeOf(b, this);
            return b;
          },
        },
      };
      Object.defineProperties(Nzu.prototype, obj);
    });
  }
}

module.exports = new Nzu();
