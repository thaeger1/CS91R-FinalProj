let _width = 800;
let _height = 600;

let pv = [];        // list of vectors that represent our particles
let pr = [];        // r is position, v is velocity
let pc = [];

let objGrid  = [];   // 2d array for our grid, store as collocated, treat as staggered
let velGrid  = [];
let lastVel  = [];
let rGrid    = [];
let ptcGrid  = [];
let densGrid = [];

// TODO: replace with p5.js preload function
let time_buff = 10; // increase for more "startup" time

// water tank dimensions
let rect_w = 400;
let rect_h = 200;

// handleCollisions
let minX = (_width - rect_w)/2;
let minY = (_height - rect_h)/2;
let maxX = _width - (_width - rect_w)/2;
let maxY = _height - (_height - rect_h)/2;

// simulator vars
let g = 1000;
let flipRatio = .9;
let cellSize = 10;
let num_ptc = 1000;
let r = 0.3 * cellSize;
let pressureIter = 50;

let substep = 1.5;
let speed = 1;

// force incompressibility
let o = 1.9;

// push ptc
let dMin = 2 * r;
let iter = 3;

// draw vel
let max_vel = 1;

// init ptc
let lbuffer = 0;
let rbuffer = 10;
let ybuffer = 5;


// INTERACTIVE STUFF (handpose/ mouse force)

var mouseStrength = 1000000;  // Strength of the mouse force
var mouseForceRadius = 50;  // Radius of the mouse force field

let handpose;
let video;
let predictions = [];


function modelReady() {
  console.log("Model ready!");
}

// NOTES: This function initializes the canvas, the tank, and any arrays we need to store data.
  // It also initializes our particles before simulating, so we can change what type of scenario we
  // want to simulate in here by changing / calling initParticles()
function setup() {
  createCanvas(_width, _height);

  fill(255);
  noStroke();

  frameRate(60);

  initObjGrid();
  initVelGrid();
  initPtcGrid();
  initParticles(num_ptc);
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints() {
  for (let i = 0; i < predictions.length; i += 1) {
    const prediction = predictions[i];
    for (let j = 0; j < prediction.landmarks.length; j += 1) {
      const keypoint = prediction.landmarks[j];
      fill(0, 255, 0);
      noStroke();
      ellipse(keypoint[0], keypoint[1], 10, 10);
    }
  }
}
function mouseMapping() {
  // Check if any predictions exist
  if (predictions.length > 0) {
    // Get the first prediction
    const prediction = predictions[0];
    // Get the index finger landmark
    const indexFinger = prediction.landmarks[8];
    mouseX = indexFinger[0];
    mouseY = indexFinger[1];
  }
}

function setupCamera() {
  video = createCapture(VIDEO);
  video.size(width, height);
  handpose = ml5.handpose(video, modelReady);
  handpose.on("predict", results => {
    predictions = results;
  });
  video.hide();
}

let functionCalled = false;
let dt = 1 / 60;
function draw() {
  if (frameCount < time_buff) return; 

  background(228,202,159); // #savebeige
  fill (25); strokeWeight(0); rect(width-75,0,75,50);
  fill(255); text("fr: " + str(floor(frameRate())), _width - 50, 25);      // frame rate text
  fill(25); text("1 for mouse force", _width - 200, 15);      // frame rate text
  fill(25); text("2 for handpose", _width - 200, 30);      // frame rate text
  stroke(0); strokeWeight(3); fill(35); rect((_width-rect_w)/2, (_height-rect_h)/2, rect_w, rect_h); // draw tank
  // add rotation by angle theta, will require reworking forces applied in particle step

  if (key == 'g') drawGrid();
  if (key == 'v') drawVel();

  // press 2 to toggle handpose
  // press 1 to toggle mouse force (default)
  if (key == '2') {
    if (!functionCalled) {
      setupCamera();
      functionCalled = true;
    }
  }

  if (key == '1') {
    if (functionCalled) {
      video.remove();
      functionCalled = false;
    }
  }
 
  /// PHYSICS SIM ///
  // let sdt = dt / substep;

  for (let k = 0; k < substep; k++) {
    clearPtcGrid();
    clearTank();
    clearDens();

    // simulate particles //
    for (let i = 0; i < num_ptc; i++) {
      updateParticle(i, dt/substep);
    }

    for (let i = 0; i < num_ptc; i++) {
      pushPtc(i);
    }

    for (let i = 0; i < num_ptc; i++) {
      handleCollisions(i);
    }

    // particles -> grid : velocities //
    ptcToGrid();

    // update density //
    updateDensity();

    // make velocities incompressible //
    ForceIncompressability();

    // grid -> particles : velocities //
    gridToPtc();
  }

  /// END PHYSICS SIM ///

  /// DRAWING ///

  doColors();

  // draw all of our particles
  for (let i = 0; i < num_ptc; i++) {
    fill(pc[3*i],pc[3*i+1],pc[3*i+2]); stroke(255); strokeWeight(0.5); ellipse(pr[i].x, pr[i].y, r, r);
  }

  if (functionCalled == true) {
    drawKeypoints();
    mouseMapping();
  }
  // draw the mouse force field
  noFill();  // Don't fill the circle
  stroke(0, 255, 0);  // Set the stroke color to green
  strokeWeight(2);  // Set the stroke weight to 2
  ellipse(mouseX, mouseY, mouseForceRadius*2, mouseForceRadius*2);  // Draw the circle
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
      ty += (axis) ?  0 : (cellSize/2);
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
      tx -= (axis) ? (cellSize/2) : 0;
      ty += (axis) ? 0 : (cellSize/2);

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
        // if (i == 0) console.log(pv[i].x);

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

function ForceIncompressability(dt) {

  // update lastVel
  for (let i = 0; i < velGrid.length; i++) {
    for (let j = 0; j < velGrid[i].length; j++) {
      lastVel[i][j] = velGrid[i][j];
    }
  }

  for (let i = 0; i < pressureIter; i++) {
    for (let x = 1; x < velGrid.length-1; x++) {
      for (let y = 1; y < velGrid[y].length-1; y++) {
        if (objGrid[x][y] != 1) continue;

        let ul = velGrid[x][y].x;
        let vb = velGrid[x][y].y;
        let ur = velGrid[x+1][y].x;
        let vt = velGrid[x][y-1].y;

        // find divergence d = u_i+1,j - u_ij + v_i,j+1 - v_ij
        let _d = ur - ul + vt - vb;

        // assuming 0 = wall and 1 = liquid (air and water), _s = s_i+1,j + s_i-1,j + s_i,j+1 + s_i,j-1
        let _s1 = (objGrid[x+1][y] != 0) ? 1 : 0;
        let _s2 = (objGrid[x-1][y] != 0) ? 1 : 0;
        let _s3 = (objGrid[x][y+1] != 0) ? 1 : 0;
        let _s4 = (objGrid[x][y-1] != 0) ? 1 : 0;
        let _s = _s1 + _s2 + _s3 + _s4;
        if (_s == 0) continue;

        if (particleRestDens > 0) {
          var k = 1;
          var comp = densGrid[x][y] - particleRestDens;
          if (comp > 0) _d = _d - k * comp;
        }

        let p = -_d / _s;
        p *= o;

        // write back to velGrid
        velGrid[x][y].x   -= _s2 * p; //ul
        velGrid[x][y].y   -= _s3 * p; //vb
        velGrid[x+1][y].x += _s1 * p; //ur
        velGrid[x][y-1].y += _s4 * p; //vt
      }
    }
  }
}

// function updateParticle(idx, dt) {
//   pv[idx] = p5.Vector.add(pv[idx],new p5.Vector(0,g).mult(dt)); // update velocity, v = v + g * dt
//   pr[idx] = p5.Vector.add(pr[idx],pv[idx].mult(dt));            // update position, r = r + dt * v

//   let cell_x = constrain(floor((pr[idx].x - (_width - rect_w)/2) / cellSize)+1, 1, rect_w/cellSize);
//   let cell_y = constrain(floor((pr[idx].y - (_height - rect_h)/2) / cellSize)+1, 1, rect_h/cellSize);

//   if (objGrid[cell_x][cell_y] == undefined) objGrid[cell_x][cell_y] = 1;

//   // if (objGrid[cell_x][cell_y] == 1) 
//   ptcGrid[cell_x][cell_y].push(idx);
// }

function updateParticle(idx, dt) {
  // Update velocity, v = v + g * dt
  pv[idx] = p5.Vector.add(pv[idx],new p5.Vector(0,g).mult(dt)); // update velocity, v = v + g * dt
  pr[idx] = p5.Vector.add(pr[idx],pv[idx].mult(dt));            // update position, r = r + dt * v           

  // Calculate the distance between the particle and the mouse
  var dx = pr[idx].x - mouseX;
  var dy = pr[idx].y - mouseY;
  var dist = Math.sqrt(dx * dx + dy * dy);


   if (dist > mouseForceRadius){
    // Calculate the cell coordinates of the particle
      pv[idx] = p5.Vector.add(pv[idx],new p5.Vector(0,g).mult(dt)); // update velocity, v = v + g * dt
    pr[idx] = p5.Vector.add(pr[idx],pv[idx].mult(dt));            // update position, r = r + dt * v

    let cell_x = constrain(floor((pr[idx].x - (_width - rect_w)/2) / cellSize)+1, 1, rect_w/cellSize);
    let cell_y = constrain(floor((pr[idx].y - (_height - rect_h)/2) / cellSize)+1, 1, rect_h/cellSize);

    if (objGrid[cell_x][cell_y] == undefined) objGrid[cell_x][cell_y] = 1;

    if (objGrid[cell_x][cell_y] == 1) 
    ptcGrid[cell_x][cell_y].push(idx);
  }
    else {  
      // Avoid division by zero
      if (dist < 1.0) dist = 1.0;  
  
      // Calculate the force exerted by the mouse on the particle
      var forceX = mouseStrength * dx / (dist * dist * dist);
      var forceY = mouseStrength * dy / (dist * dist * dist);
  
      // Update the particle velocity
      pv[idx].x += forceX;
      pv[idx].y += forceY;
  
      // Calculate the cell coordinates of the particle
      var cell_x = constrain(floor((pr[idx].x - (_width - rect_w)/2) / cellSize)+1, 1, rect_w/cellSize);
      var cell_y = constrain(floor((pr[idx].y - (_height - rect_h)/2) / cellSize)+1, 1, rect_h/cellSize);
  
      // Set the cell in the objGrid to 1 (wall) if it's within the force field
      if (isNaN(objGrid[cell_x][cell_y]) || objGrid[cell_x][cell_y] < 1) {
        objGrid[cell_x][cell_y] = 1;
      }
  
      // Only push the particle into the cell if it's a valid cell
      if (objGrid[cell_x][cell_y] == 1) {
        ptcGrid[cell_x][cell_y].push(idx);
      }
    }
}


// added green circle
// update particle


function pushPtc(idx) {
  for (let i = 0; i < iter; i++) {

    let cx = constrain(floor((pr[idx].x - (_width - rect_w)/2) / cellSize)+1, 1, rect_w/cellSize);
    let cy = constrain(floor((pr[idx].y - (_height - rect_h)/2) / cellSize)+1, 1, rect_h/cellSize);

    // let cx = floor((pr[idx].x - (_width - rect_w)/2) / cellSize)+1;
    // let cy = floor((pr[idx].y - (_height - rect_h)/2) / cellSize)+1;
  
    let x0 = max(cx-1,0);
    let x1 = min(cx+1,rect_w/cellSize+1);
    
    let y0 = max(cy-1,0);
    let y1 = min(cy+1,rect_h/cellSize+1);
    
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let j = 0; j < ptcGrid[x][y].length; j++) {
          let oidx = ptcGrid[x][y][j];
          if (oidx == idx) continue;
          
    
          let dx = pr[oidx].x - pr[idx].x;
          let dy = pr[oidx].y - pr[idx].y;
          let dsq = dx*dx + dy*dy;
          if (dsq > dMin*dMin || dsq == 0) {
            continue;
          }
          
          let d = sqrt(dsq);
          let s = .5*(dMin-d)/d;
          dx *= s;
          dy *= s;

          pr[idx].x -= dx;
          pr[idx].y -= dy;
    
          pr[oidx].x += dx;
          pr[oidx].y += dy;

          pc[3*idx]    = (pc[3*idx] + pc[3*oidx])/2;
          pc[3*oidx]   = (pc[3*idx] + pc[3*oidx])/2;
          pc[3*idx+1]  = (pc[3*idx+1] + pc[3*oidx+1])/2;
          pc[3*oidx+1] = (pc[3*idx+1] + pc[3*oidx+1])/2;
          pc[3*idx+2]  = (pc[3*idx+2] + pc[3*oidx+2])/2;
          pc[3*oidx+2] = (pc[3*idx+2] + pc[3*oidx+2])/2;
        }
      }
    }
  }
}


function doColors() {
  let h1 = 1 / cellSize;

  for (let i = 0; i < num_ptc; i++) {
    let ds = 1;

    pc[3*i]   = constrain(pc[3*i] - ds, 0, 255);
    pc[3*i+1] = constrain(pc[3*i+1] - ds, 0, 255);
    pc[3*i+2] = constrain(pc[3*i+2] + ds, 0, 255);

    let xi = constrain(floor((pr[i].x - (_width - rect_w)/2) / cellSize), 1, rect_w/cellSize);
    let yi = constrain(floor((pr[i].y - (_height - rect_h)/2) / cellSize), 1, rect_h/cellSize);

    if (particleRestDens > 0) {
      let relDens = densGrid[xi][yi] / particleRestDens;
      // if (i == 0) console.log(particleRestDens, relDens, densGrid[xi][yi]);
      if (relDens < 0.5) {
        pc[3*i]   = 200;
        pc[3*i+1] = 200;
        pc[3*i+2] = 255;
      }
    }
  }
}


function handleCollisions(idx) {
  if (pr[idx].x < minX+r/2) {
    // console.log("x too small");
    pr[idx].x = minX + r/2;
    pv[idx].x *= -1;
    // pv[idx].x = 0;
  }
  if (pr[idx].x > maxX-r/2) {
    // console.log("x too big");
    pr[idx].x = maxX - r/2;
    pv[idx].x *= -1;
    // pv[idx].x = 0;
  }
  if (pr[idx].y < minY+r/2) {
    // console.log("y too small");
    pr[idx].y = minY + r/2;
    pv[idx].y *= -1;
    // pv[idx].y = 0;
  }
  if (pr[idx].y > maxY-r/2) {
    // console.log("y too big");
    pr[idx].y = maxY - r/2;
    pv[idx].y *= -1;
    // pv[idx].y = 0;
  }
}

let particleRestDens = 0;
function updateDensity() {
  let h = cellSize;
  let h1 = 1/h;
  let h2 = .5 * h;

  // for each ptc
  for (let i = 0; i < num_ptc; i++) {
    // get x, y & clamp to cells
    let x = constrain(pr[i].x-(_width-rect_w)/2,0,rect_w);
    let y = constrain(pr[i].y-(_height-rect_h)/2,0,rect_h);

    let x0 = floor((x-h2) * h1);
    let tx = ((x - h2) - x0 * h) * h1;
    let x1 = min(x0 + 1, densGrid.length-2);
    // if (i == 0) console.log(x, x0, tx, x1);
    if (x0 < 0 || x0 >= densGrid.length-1) continue;

    let y0 = floor((y-h2)*h1);
    let ty = ((y - h2) - y0*h) * h1;
    let y1 = min (y0 + 1, densGrid[x0].length-2);
    // if (i == 0) console.log(y,y0,ty,y1);

    let sx = 1 - tx;
    let sy = 1 - ty;

    if (x0 < _width/cellSize & y0 < _height/cellSize) densGrid[x0][y0] += sx * sy;
    if (x1 < _width/cellSize & y1 < _height/cellSize) densGrid[x1][y0] += tx * sy;
    if (x1 < _width/cellSize & y1 < _height/cellSize) densGrid[x1][y1] += tx * ty;
    if (x0 < _width/cellSize & y0 < _height/cellSize) densGrid[x0][y1] += sx * ty;
    // if (i == 0) console.log(densGrid[x0][y0]);
  }

  if (particleRestDens == 0) {
    let sum = 0;
    let numFluidCells = 0;

    for (let i = 0; i < densGrid.length; i++) {
      for (let j = 0; j < densGrid[i].length; j++) {
        if (objGrid[i][j] == 1) {
          sum += densGrid[i][j];
          numFluidCells++;
        }
    
        if (numFluidCells > 0) particleRestDens = sum / numFluidCells;
      }
    }
  }
}

/// Simulator helper function and init functions below this point ///

function clearTank() {
  // clear (inside of) grid and replace with undefined (air)
  for (let x = 1; x < objGrid.length-1; x++) {
    for (let y = 1; y < objGrid[x].length-1; y++) {
      objGrid[x][y] = undefined;
    }
  }
}

function initParticles(num_ptc) {

  for (let i = 0; i < num_ptc; i++) { 
    let _x = random((_width-rect_w)/2 + lbuffer*cellSize, (_width+rect_w)/2 -   rbuffer*cellSize);
    let _y = random((_height-rect_h)/2 + ybuffer*cellSize, (_height+rect_h)/2 - ybuffer*cellSize);
    pr[i] = new p5.Vector(_x,_y); // random x,y
    pv[i] = new p5.Vector(0,0);   // no starting velocity
    pc[3*i] = 0;
    pc[3*i+1] = 0;
    pc[3*i+2] = 255;
  }

  /// ### ///

  /*
  let _x = (_width-rect_w)/2 + r/2
  // (_width+rect_w)/2 -   buffer*cellSize);
  
  let _y = (_height-rect_h)/2;
  // (_height+rect_h)/2 - buffer*cellSize);

  // dam break
  for (let i = 0; i < num_ptc; i++) {
    if (_x >= (_width+rect_w)/2 - rbuffer*cellSize) {
      _x = (_width-rect_w)/2 + r/2;
      _y += (1.3*r);
      if (_y > (_height+rect_h)/2) _y = (_height-rect_h)/2;
    }
    // if (_y >= ((_height+rect_h)/2 - buffer*cellSize)) return;

    pr[i] = new p5.Vector(_x+random(-100,100)/100,_y); // random x,y
    pv[i] = new p5.Vector(0,0);   // no starting velocity
    _x += (1.3*r);
  }
  */
}

function initVelGrid() {
  for (let i = 0; i < floor(rect_w/cellSize)+2; i++) {
    velGrid[i] = [];
    rGrid[i] = [];
    lastVel[i] = [];
    densGrid[i] = [];
    for (let j = 0; j < floor(rect_h/cellSize)+2; j++) {
      velGrid[i][j] = new p5.Vector(0,0);
      rGrid[i][j] = new p5.Vector(0,0);
      densGrid[i][j] = 0;
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

function clearDens() {
  for (let i = 0; i < densGrid.length; i++) {
    for (let j = 0; j < densGrid[i].length; j++) {
      densGrid[i][j] = 0;
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

  // for (let i = 0; i < objGrid.length; i++) {
  //   for (let j = 0; j < objGrid[i].length; j++) {
  //     fill(0,255,0); strokeWeight(0); text(str(i) + "," + str(j), (_width-rect_w)/2 + (i-1)*cellSize + 2.5, (_height-rect_h)/2 + (j-1)*cellSize + 10);
  //     fill(255,0,0); text(objGrid[i][j], (_width-rect_w)/2 + (i)*cellSize - 10, (_height-rect_h)/2 + (j-1)*cellSize + 10);
  //   }
  // }
}

function drawVel() {
  for (let i = 0; i < velGrid.length; i++) {
    for (let j = 0; j < velGrid[i].length; j++) {

      strokeWeight(1);
      let mx = (_width-rect_w)/2 + (i-1)*cellSize + cellSize/2;
      let msx = constrain(velGrid[i][j].x/max_vel,-1,1);

      let my = (_height-rect_h)/2 + (j-1)*cellSize + cellSize/2;
      let msy = constrain(velGrid[i][j].y/max_vel,-1,1);

      if (velGrid[i][j].x != 0) {
        stroke(0,255,0); line(mx-cellSize/2,my,mx-(1-msx)*(cellSize/2),my);
      }
      if (velGrid[i][j].y != 0) {
        stroke(255,0,0); line(mx,my+cellSize/2,mx,my+(1-msy)*(cellSize/2));
      }
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

function initPtcGrid() {
  for (let i = 0; i < objGrid.length; i++) {
    ptcGrid[i] = [];
    for (let j = 0; j < objGrid[i].length; j++) {
      ptcGrid[i][j] = [];
    }
  }
}

function clearPtcGrid() {
  for (let i = 0; i < objGrid.length; i++) {
    // ptcGrid[i] = [];
    for (let j = 0; j < objGrid[i].length; j++) {
      ptcGrid[i][j].length = 0;
    }
  }
}
