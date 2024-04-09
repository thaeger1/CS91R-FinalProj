
let _width = 800;
let _height = 600;

let rect_w = 500;
let rect_h = 300;

let pv = [];        // list of vectors that represent our particles
let pr = [];        // r is position, v is velocity

let objGrid = [];   // 2d array for our grid, store as collocated, treat as staggered
let velGrid = [];

let cellSize = 10;  // keep rect width/height in mind when adjusting

let time_buff = 10; // increase for more "startup" time

function setup() {
  createCanvas(_width, _height);
  fill(255);
  noStroke();

  frameRate(30);

  // init objGrid here
  initObjGrid(objGrid);
  // init velGrid here
  initVelGrid(velGrid);
  // init particles
  initParticles(num_ptc);
}

function draw() {
  // get out frameRate, as we will be using this for our dt in our physics sim
  let dt = 1/frameRate();
  if (frameCount < time_buff) return; 

  background(228,202,159); // #savebeige
  fill(0); text("fr: " + str(floor(frameRate())), _width - 50, 25);      // frame rate text
  fill(25); rect((_width-rect_w)/2, (_height-rect_h)/2, rect_w, rect_h); // draw tank
  // add rotation by angle theta, will require reworking forces applied in particle step

  /// PHYSICS SIM ///

  // simulate particles //
  for (let i = 0; i < num_ptc; i++) {
    updateParticle(i, dt);
  }

  //--
  // particles -> grid : velocities //

  // updateObjGrid() to find where water is
  // readToGrid() all of our particles

  //--
  // make velocities incompressible //

  // ForceIncompress() to update velGrid

  //--
  // grid -> particles : velocities //

  // readFromGrid() to particles

  /// END PHYSICS SIM ///

  // draw all of our particles
}

function readToGrid(velGrid, pv, pr) {
  // for i in range len(pv or pr)
  for (let i = 0; i < num_ptc; i++) {
    // find what cell we are in
    let cell_x = floor(pr[i].x / cellSize);
    let cell_y = floor(pr[i].y / cellSize);
    console.log(pr, cell_x, cell_y);

    // find lx, ly, local x,y coords within the cell
    // let lx = pr[i].x - cell_x*cellSize;
    // let ly = pr[i].y - cell_y*cellSize;
    
    // read velocities in
    // make 4 vectors around the cell, 
      // u_i,j
      // v_i,j
      // u_i+1,j
      // v_i,j+1
  }
}

// TODO
function ForceIncompress(velGrid) {
  // where we calculate divergence
}

function readFromGrid(velGrid, pv, pr) {
  // give particles velocity based on which grid cell they are in
}

function updateParticle(index, dt) {
  // update velocity at index

  // pv[index].Add() // add might save some time
  // new p5.Vector(vx + g*dt, vy + g*dt);
  // v = v + g * dt
  
  // update position at index
  //
  // r = r + dt * v
}

// TODO
function updateObjGrid(objGrid) {
  // clear (inside of) grid and replace with 0s (air)
  // go over every particle, mark cell particle is in as water (1) as long as its not a wall
}

function initParticles(num_ptc) {
  // for num particles
  for (let i = 0; i < num_ptc; i++) {
    let _x = random((_width-rect_w)/2 + 1, (_width+rect_w)/2 - 1);
    let _y = random((_height-rect_h)/2 + 1, (_height+rect_h)/2 - 1);
    pr[i] = new p5.Vector(_x,_y); // random x,y
    pv[i] = new p5.Vector(0,0);   // no starting velocity
  }
}

function initVelGrid(velGrid) {
  for (let i = 0; i < floor(_width/cellSize); i++) {
    velGrid[i] = [];
    for (let j = 0; j < floor(_height/cellSize); j++) {
      velGrid[i][j] = new p5.Vector(0,0); // we want 0 for water, 1 for walls, and undef for air
    }
  }
}

function initObjGrid(objGrid) {
  for (let i = 0; i < floor(_width/cellSize); i++) {
    objGrid[i] = [];
    for (let j = 0; j < floor(_height/cellSize); j++) {
      if (i == 0 || j == 0 || i == _width - 1 || j == _height - 1) {
        objGrid[i][j] == 2;
      } else {
        objGrid[i][j] = 0; // we want 0 for air, 1 for water, and 2 for walls
      }
    }
  }
}