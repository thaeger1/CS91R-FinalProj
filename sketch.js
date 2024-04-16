let _width = 800;
let _height = 600;

let g = 9.81
let cellSize = 25;  // keep rect width/height in mind when adjusting
let num_ptc = 250;

let rect_w = 500;
let rect_h = 300;
let speed = 20;
let r = 3;          // ptc radius

let pv = [];        // list of vectors that represent our particles
let pr = [];        // r is position, v is velocity

let objGrid = [];   // 2d array for our grid, store as collocated, treat as staggered
let velGrid = [];
let lastVel = [];
let rGrid   = [];
// let ptcGrid = [];

// TODO: replace with p5.js preload function
let time_buff = 10; // increase for more "startup" time

let minX = (_width - rect_w)/2;
let minY = (_height - rect_h)/2;
let maxX = _width - (_width - rect_w)/2;
let maxY = _height - (_height - rect_h)/2;

let flipRatio = 0.4;

function setup() {
  createCanvas(_width, _height);
  fill(255);
  noStroke();

  frameRate(30);

  // init objGrid here
  initObjGrid();
  // init velGrid here
  initVelGrid();
  // init particles
  initParticles(num_ptc);

  vZero = new p5.Vector(0,0);
}

function draw() {
  let dt = 1/frameRate();
  if (frameCount < time_buff) return; 

  background(228,202,159); // #savebeige
  fill (25); strokeWeight(0); rect(width-75,0,75,50);
  fill(255); text("fr: " + str(floor(frameRate())), _width - 50, 25);      // frame rate text
  stroke(0); strokeWeight(3); fill(35); rect((_width-rect_w)/2, (_height-rect_h)/2, rect_w, rect_h); // draw tank
  // add rotation by angle theta, will require reworking forces applied in particle step

  if (key == 'g') drawGrid();
  if (key == 'v') drawVel();

  /// PHYSICS SIM ///
  clearTank();

  // simulate particles //
  for (let i = 0; i < num_ptc; i++) {
    updateParticle(i, dt*speed);
  }

  //--
  // particles -> grid : velocities //
  ptcToGrid();

  //--
  // make velocities incompressible //
  ForceIncompressability();

  //--
  // grid -> particles : velocities //
  gridToPtc();

  /// END PHYSICS SIM ///

  // draw all of our particles
  for (let i = 0; i < num_ptc; i++) {
    fill(0,0,255); stroke(255); strokeWeight(0.5); ellipse(pr[i].x, pr[i].y, r, r);
  }
}

function pushPtc() {
  // for each other particle in the cell with me
    // get other ptc x,y
    // check if we are overlapping (find dx, dy)
    // if we are
      // d = sqrt(dist)
      // s = 0.5 * (min dist - d) / d
      // dx *= s;
      // dy *= s;

      // move both ptc by dx, dy
      // ptc.i -= dx, dy
      // ptc.j += dx, dy

      // color stuff
}

function ptcToGrid() {
  // set lastVel
  for (let i = 0; i < velGrid.length; i++) {
    for (let j = 0; j < velGrid[i].length; j++) {
      lastVel[i][j] = velGrid[i][j];
    }
  }

  clearRV();

  for (let i = 0; i < num_ptc; i++) {
    for (let axis = 0; axis <= 1; axis++) {
      let tx = (pr[i].x - (_width - rect_w)/2);
      let ty = (pr[i].y - (_height - rect_h)/2);
      tx -= (axis)  ? (cellSize/2) : 0;
      ty += (!axis) ? (cellSize/2) : 0;
      let cell_x = floor(tx/cellSize)+1;
      let cell_y = floor(ty/cellSize)+1;

      // find lx, ly, local x,y coords within the cell
      let lx = tx - (cell_x-1)*(cellSize);
      let ly = ty - (cell_y-1)*(cellSize);

      let w1 = (1-(lx/cellSize)) * (ly/cellSize);
      let w2 = (lx/cellSize)     * (ly/cellSize);
      let w3 = (lx/cellSize)     * (1-(ly/cellSize));
      let w4 = (1-(lx/cellSize)) * (1-(ly/cellSize));

      let qp = (axis) ? pv[i].y : pv[i].x;

      // write q_i / r_i to corners of velGrid / rGrid
      if (axis == 0) { // u, .x component
        velGrid[cell_x][cell_y].x     += (objGrid[cell_x][cell_y] == 0)     ? 0 : w1 * qp; // q1
        velGrid[cell_x+1][cell_y].x   += (objGrid[cell_x+1][cell_y] == 0)   ? 0 : w2 * qp; // q2
        velGrid[cell_x+1][cell_y-1].x += (objGrid[cell_x+1][cell_y-1] == 0) ? 0 : w3 * qp; // q3
        velGrid[cell_x][cell_y-1].x   += (objGrid[cell_x][cell_y-1] == 0)   ? 0 : w4 * qp; // q4

        rGrid[cell_x][cell_y].x       += w1;
        rGrid[cell_x+1][cell_y].x     += w2;
        rGrid[cell_x+1][cell_y-1].x   += w3;
        rGrid[cell_x][cell_y-1].x     += w4;
      } else if (axis == 1) { // v, .y component
        velGrid[cell_x][cell_y].y     -= (objGrid[cell_x][cell_y] == 0)     ? 0 : w1 * qp; // q1
        velGrid[cell_x+1][cell_y].y   -= (objGrid[cell_x+1][cell_y] == 0)   ? 0 : w2 * qp; // q2
        velGrid[cell_x+1][cell_y-1].y -= (objGrid[cell_x+1][cell_y-1] == 0) ? 0 : w3 * qp; // q3
        velGrid[cell_x][cell_y-1].y   -= (objGrid[cell_x][cell_y-1] == 0)   ? 0 : w4 * qp; // q4

        rGrid[cell_x][cell_y].y       += w1;
        rGrid[cell_x+1][cell_y].y     += w2;
        rGrid[cell_x+1][cell_y-1].y   += w3;
        rGrid[cell_x][cell_y-1].y     += w4;
      }
    }
  }

  divR(); // divide all velocity components in velGrid by corresponding rGrid values

  // reset velocities in cells adj to wall to 0
  for (let i = 0; i < velGrid.length; i++) {
    for (let j = 0; j < velGrid[i].length; j++) {
      if (objGrid[i][j] == 0 || (i > 0 && objGrid[i-1][j] == 0)) velGrid[i][j].x = lastVel[i][j].x;
      if (objGrid[i][j] == 0 || (j < velGrid[i].length && objGrid[i][j+1] == 0)) velGrid[i][j].y = lastVel[i][j].y;
    }
  }
}

function gridToPtc() {
  for (let i = 0; i < num_ptc; i++) {
    for (let axis = 0; axis <= 1; axis++) {

      let tx = (pr[i].x - (_width - rect_w)/2);
      let ty = (pr[i].y - (_height - rect_h)/2);
      tx -= (axis)  ? (cellSize/2) : 0;
      ty += (!axis) ? (cellSize/2) : 0;

      let cell_x = floor(tx/cellSize)+1;
      let cell_y = floor(ty/cellSize)+1;
    
      // find lx, ly, local x,y coords within the cell
      let lx = tx - (cell_x-1)*(cellSize);
      let ly = ty - (cell_y-1)*(cellSize);

      let w1 = (1-(lx/cellSize)) * (ly/cellSize);
      let w2 = (lx/cellSize)     * (ly/cellSize);
      let w3 = (lx/cellSize)     * (1-(ly/cellSize));
      let w4 = (1-(lx/cellSize)) * (1-(ly/cellSize));

      // write velocity from corners to particle
      let sumqPIC = 0;
      let sumqFLIP = 0;
      let sumw = 0;
      if (axis == 0) {
        if (objGrid[cell_x][cell_y] != undefined) {
          sumqPIC += velGrid[cell_x][cell_y].x * w1; // q1
          sumqFLIP += (velGrid[cell_x][cell_y].x - lastVel[cell_x][cell_y].x) * w1;
          sumw += w1;
        }
        if (objGrid[cell_x+1][cell_y] != undefined) {
          sumqPIC += velGrid[cell_x+1][cell_y].x * w2; // q2
          sumqFLIP += (velGrid[cell_x+1][cell_y].x - lastVel[cell_x+1][cell_y].x) * w2;
          sumw += w2;
        }
        if (objGrid[cell_x+1][cell_y-1] != undefined) {
          sumqPIC += velGrid[cell_x+1][cell_y-1].x * w3; // q3
          sumqFLIP += (velGrid[cell_x+1][cell_y-1].x - lastVel[cell_x+1][cell_y-1].x) * w3;
          sumw += w3;
        }
        if (objGrid[cell_x][cell_y-1] != undefined) {
          sumqPIC += velGrid[cell_x][cell_y-1].x * w4; // q4
          sumqFLIP += (velGrid[cell_x][cell_y-1].x - lastVel[cell_x][cell_y-1].x) * w4;
          sumw += w4;
        }

        let qpPIC = sumqPIC / sumw;
        // let qpFLIP = pv[i].x + sumqFLIP / sumw;
        let qpFLIP = sumqFLIP / sumw;

        pv[i].x = (1 - flipRatio) * qpPIC + flipRatio * qpFLIP;

        // pv[i].x = qpPIC;

      } else if (axis == 1) {
        if (objGrid[cell_x][cell_y] != undefined) {
          sumqPIC += velGrid[cell_x][cell_y].y * w1; // q1
          sumqFLIP += (velGrid[cell_x][cell_y].y - lastVel[cell_x][cell_y].y) * w1;
          sumw += w1;
        }
        if (objGrid[cell_x+1][cell_y] != undefined) {
          sumqPIC += velGrid[cell_x+1][cell_y].y * w2; // q2
          sumqFLIP += (velGrid[cell_x+1][cell_y].y - lastVel[cell_x+1][cell_y].y) * w2;
          sumw += w2;
        }
        if (objGrid[cell_x+1][cell_y-1] != undefined) {
          sumqPIC += velGrid[cell_x+1][cell_y-1].y * w3; // q3
          sumqFLIP += (velGrid[cell_x+1][cell_y-1].y - lastVel[cell_x+1][cell_y-1].y) * w3;
          sumw += w3;
        }
        if (objGrid[cell_x][cell_y-1] != undefined) {
          sumqPIC += velGrid[cell_x][cell_y-1].y * w4; // q4
          sumqFLIP += (velGrid[cell_x][cell_y-1].y - lastVel[cell_x][cell_y-1].y) * w4;
          sumw += w4;
        }

        let qpPIC = sumqPIC / sumw;
        let qpFLIP = sumqFLIP / sumw;
        // let qpFLIP = pv[i].y + sumqFLIP / sumw;

        pv[i].y = (1 - flipRatio) * qpPIC + flipRatio * qpFLIP;
      }
    }
  }
}

let o = 1.9;
/* where we calculate divergence

    // ||======================||
    // ||          | v_i,j+1   ||
    // ||          v           ||
    // || u_ij ->   <- u_i+1,j ||
    // ||         ^            ||
    // ||    v_ij |            ||
    // ||======================||

    // pointing in means positive inflow, pointing out mean negative inflow
    // sign flips to account for inflow/outflow directions
    // divergence = u_i+1,j - u_ij + v_i,j+1 - v_ij

*/
function ForceIncompressability() {
  // update lastVel
  for (let i = 0; i < velGrid.length; i++) {
    for (let j = 0; j < velGrid[i].length; j++) {
      lastVel[i][j] = velGrid[i][j];
    }
  }

  for (let x = 1; x < velGrid.length-1; x++) {
    for (let y = 1; y < velGrid[y].length-1; y++) {
      if (objGrid[x][y] != 1) continue;
      /* get 4 components around the cell,
        u_i,j   = velGrid[x][y].x;   (u left, or bl)
        v_i,j   = velGrid[x][y].y;   (v bot, or vb)
        u_i+1,j = velGrid[x+1][y].x; (u right, or ur)
        v_i,j+1 = velGrid[x][y+1].y; (v top, or vt)
      */
      let ul = velGrid[x][y].x;
      let vb = velGrid[x][y].y;
      let ur = velGrid[x+1][y].x;
      let vt = velGrid[x][y-1].y;

      // find divergence d = u_i+1,j - u_ij + v_i,j+1 - v_ij
      let _d = o*(ur - ul + vt - vb);

      // assuming 0 = wall and 1 = liquid (air and water), _s = s_i+1,j + s_i-1,j + s_i,j+1 + s_i,j-1
      let _s1 = (objGrid[x+1][y] != 0) ? 1 : 0;
      let _s2 = (objGrid[x-1][y] != 0) ? 1 : 0;
      let _s3 = (objGrid[x][y+1] != 0) ? 1 : 0;
      let _s4 = (objGrid[x][y-1] != 0) ? 1 : 0;
      let _s = _s1 + _s2 + _s3 + _s4;
      if (_s == 0) continue;

      // add/sub d
      ul += (_s2 * _d) / _s;
      vb += (_s3 * _d) / _s;
      ur -= (_s1 * _d) / _s;
      vt -= (_s4 * _d) / _s;

      // console.log(_d);
      // if (ur - vb - ul + vt != 0) {
      //   console.log("uh oh");
      //   console.log(x,y,vb,vt,_s);
      // }

      // write back to velGrid
      velGrid[x][y].x   = ul;
      velGrid[x][y].y   = vb;
      velGrid[x+1][y].x = ur;
      velGrid[x][y-1].y = vt;
    }
  }
}

function updateParticle(index, dt) {
  pv[index] = p5.Vector.add(pv[index],new p5.Vector(0,g).mult(dt)); // update velocity, v = v + g * dt
  pr[index] = p5.Vector.add(pr[index],pv[index].mult(dt)); // update position, r = r + dt * v

  // console.log(pr[index]);
  if (pr[index].x < minX) {
    console.log("x too small");
    pr[index].x = minX+1;
    pv[index].x = 0;
  }
  if (pr[index].x > maxX) {
    console.log("x too big");
    pr[index].x = maxX-1;
    pv[index].x = 0;
  }
  if (pr[index].y < minY+1) {
    // console.log("y too small");
    pr[index].y = minY+1;
    pv[index].y = 0;
  }
  if (pr[index].y > maxY-1) {
    // console.log("y too big");
    pr[index].y = maxY-1;
    pv[index].y = 0;
  }

  let cell_x = floor((pr[index].x - (_width - rect_w)/2) / cellSize)+1;
  let cell_y = floor((pr[index].y - (_height - rect_h)/2) / cellSize)+1;
  if (objGrid[cell_x][cell_y] == undefined) objGrid[cell_x][cell_y] = 1;

  // update what cell i am in on the ptc grid (need to make a way to lookup ptc in space)
}

function clearTank() {
  // clear (inside of) grid and replace with undefined (air)
  for (let x = 1; x < objGrid.length-1; x++) {
    for (let y = 1; y < objGrid[x].length-1; y++) {
      objGrid[x][y] = undefined;
    }
  }
}

let buffer = 0;
function initParticles(num_ptc) {
  // for num particles
  for (let i = 0; i < num_ptc; i++) { 
    let _x = random((_width-rect_w)/2 + buffer*cellSize, (_width+rect_w)/2 -   buffer*cellSize);
    let _y = random((_height-rect_h)/2 + buffer*cellSize, (_height+rect_h)/2 - buffer*cellSize);
    pr[i] = new p5.Vector(_x,_y); // random x,y
    pv[i] = new p5.Vector(0,0);   // no starting velocity
  }
}

function initVelGrid() {
  for (let i = 0; i < floor(rect_w/cellSize)+2; i++) {
    velGrid[i] = [];
    rGrid[i] = [];
    lastVel[i] = [];
    for (let j = 0; j < floor(rect_h/cellSize)+2; j++) {
      velGrid[i][j] = new p5.Vector(0,0);
      rGrid[i][j] = new p5.Vector(0,0);
      lastVel[i][j] = new p5.Vector(0,0);
    }
  }
}

function clearRV() {
  for (let i = 0; i < velGrid.length; i++) {
    for (let j = 0; j < velGrid[i].length; j++) {
      rGrid[i][j] = new p5.Vector(0,0);
      velGrid[i][j] = new p5.Vector(0,0);
    }
  }
}

function divR() {
  for (let i = 0; i < velGrid.length; i++) {
    for (let j = 0; j < velGrid[i].length; j++) {
      if (rGrid[i][j].x != 0) velGrid[i][j].x /= rGrid[i][j].x;
      if (rGrid[i][j].y != 0) velGrid[i][j].y /= rGrid[i][j].y;
    }
  }
}

function drawGrid() {
  for (let x = (_width-rect_w)/2 - cellSize; x <= (_width+rect_w)/2 + cellSize; x += cellSize) {
    for (let y = (_height-rect_h)/2 - cellSize; y <= (_height+rect_h)/2 + cellSize; y += cellSize) {
      stroke(0,255,0); strokeWeight(.75); 
      line(x,(_height-rect_h)/2-cellSize,x,(_height+rect_h)/2+cellSize);
      line((_width-rect_w)/2-cellSize,y,(_width+rect_w)/2+cellSize,y);
    }
  }

  for (let i = 0; i < objGrid.length; i++) {
    for (let j = 0; j < objGrid[i].length; j++) {
      fill(0,255,0); strokeWeight(0); text(str(i) + "," + str(j), (_width-rect_w)/2 + (i-1)*cellSize + 2.5, (_height-rect_h)/2 + (j-1)*cellSize + 10);
      fill(255,0,0); text(objGrid[i][j], (_width-rect_w)/2 + (i)*cellSize - 10, (_height-rect_h)/2 + (j-1)*cellSize + 10);
    }
  }
}

let max_vel = 9;
function drawVel() {
  for (let i = 0; i < velGrid.length; i++) {
    for (let j = 0; j < velGrid[i].length; j++) {
      strokeWeight(1);
      let mx = (_width-rect_w)/2 + (i-1)*cellSize + cellSize/2;
      let my = (_height-rect_h)/2 + (j-1)*cellSize + cellSize/2;
      // ellipse(mx,my,5,5);
      let msx = constrain(velGrid[i][j].x/max_vel,-1,1);
      let msy = constrain(velGrid[i][j].y/max_vel,-1,1);
      stroke(0,255,0); line(mx-cellSize/2,my,mx-(1-msx)*(cellSize/2),my);
      stroke(255,0,0); line(mx,my+cellSize/2,mx,my+(1-msy)*(cellSize/2));
    }
  }
}

function initObjGrid() {
  // grid needs a buffer for our walls surrounding the tank
  for (let x = 0; x < floor(rect_w/cellSize) + 2; x++) {
    objGrid[x] = [];
    for (let y = 0; y < floor(rect_h/cellSize) + 2; y++) {
      if (x == 0 || y == 0 || y == (rect_h/cellSize) + 1 || x == (rect_w/cellSize) + 1) {
        objGrid[x][y] = 0;
      } else {
        objGrid[x][y] = undefined; // we want 0 for walls, 1 for water, and undefined for air
      }
    }
  }
}