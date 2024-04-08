

function setup() {
  createCanvas(_width, _height);
  fill(255);
  noStroke();

  frameRate(30);
}

let _width = 800;
let _height = 600;

let rect_w = 500;
let rect_h = 300;

let pv = [];        // list of vectors that represent our particles
let pr = [];        // r is position, v is velocity

let grid = [];      // 2d array for our grid, store as collocated, treat as staggered
let cellSize = 10;  // keep rect width/height in mind when adjusting

let time_buff = 10;

function draw() {
  let dt = frameRate();
  if (frameCount < time_buff) return; 
  background(228,202,159); // #savebeige

  // frame rate text
  fill(0); text("fr: " + str(floor(frameRate())), _width - 50, 25);

  // draw tank
  fill(25); rect((_width-rect_w)/2, (_height-rect_h)/2, rect_w, rect_h);
  // add rotation by angle theta

  // simulate particles
  for (let i = 0; i < num_ptc; i++) {
    updateParticle(i, dt);
  }

  // particles -> grid : velocities
  for (let i = 0; i < floor(_width/cellSize); i++) {
    grid[i] = [];
    for (let j = 0; j < floor(_height/cellSize); j++) {
      grid[i][j] = 0; // we want 0 for water, 1 for walls, and und for air
    }
  }
  // read velocities in using cell size and positions

  // make velocities incompressible

  // grid -> particles : velocities



  // our outline //
  
  // go over particles to update velocities
    // particles :)

  // normalize pressures
    // calc divergence
    // calc second grid
      // FLIP: copy grid

  // update velocities of particles
  // FLIP use difference of grids to update particles
}

function initParticles(num_ptc) {
  // for num particles
    // pr = [new_x, new_y]
    // pv = [0,0]
}

function updateParticle(index, dt) {
  // update velocity at index
  // v = v + g * dt
  // update position at index
  // r = r + dt * v
}