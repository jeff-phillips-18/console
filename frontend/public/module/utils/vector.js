export class Vector {

  constructor(x, y) {
    this.x = x || 0;
    this.y = y || 0;
  }

  add = vector => {
    return new Vector(this.x + vector.x, this.y + vector.y);
  };

  subtract = vector => {
    return new Vector(this.x - vector.x, this.y - vector.y);
  };

  multiply = vector => {
    return new Vector(this.x * vector.x, this.y * vector.y);
  };

  multiplyScalar = scalar => {
    return new Vector(this.x * scalar, this.y * scalar);
  };

  divide = vector => {
    return new Vector(this.x / vector.x, this.y / vector.y);
  };

  divideScalar = scalar => {
    return new Vector(this.x / scalar, this.y / scalar);
  };

  length = () => {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  };

  normalize = () => {
    return this.divideScalar(this.length());
  };
}
