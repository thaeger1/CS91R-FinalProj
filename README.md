# CS91R-FinalProj


Code on Github
 Properly formatted and commented 
 
Write-up on Github (~1024 words of prose & pictures)
 Principles (why) 
 Design (what)
 Implementation (how)
 Evaluation (how well)
 
Presentation (Google Slides, Share with me)
 6-7 minutes (~6-9 slides)
 Demo would be great!
 
Cite any outside materials (e.g., libraries, tutorials)
 Where are they from, and how did you use/improve-upon them



Principles (why) 
Why is the problem important, and why are we confident it can be solved?
Design (what)
As designers, what choices and trade-offs are we making?
Implementation (how) 
As programmers, how will we realize our design?
Evaluation (how well)
As scientists, how do we decide how well the system works?


## Write-up: 

### Principles
For our project, we chose to recreate a fluid simulator entirely within p5.js. In general, fluid dynamics is a field with broad applications such as physics to computer graphics and visual arts. The reason why we chose to solve this problem was our passion for physics applications within graphics animations. Additionally, we felt confident in both our knowledge of p5.js and our math backgrounds, and by referencing a an existing fluid sim tutorial, we could follow the theory needed in order to implement it within p5.js. (https://www.youtube.com/watch?v=XmzBREkK8kY&feature=youtu.be)

<br />

### Design
In terms of design, our approach for the fluid simulator drew inspiration from pre-existing FLIP (Fluid-Implicit Particles) water simulators built for browsers. In particular, small fluid particles represented as ellipses within a box symbolizing the fluid container. The simulation involved animating these particles within the draw() function. In the backend, we divided the water tank into a grid to facilitate velocity calculations. This meant we had to ensure the grid's parameters were boundaries representing the ends of the box, where our fluid could distinguish between whether it was touching a solid object or not, so we made flags representing 0 = wall and 1 = fluid. While our core design centered mostly on fluid logic, in terms of further interraction, we incorporated an idea where the mouse could splash the water around by giving it a "forcefield", as if it were a solid object inside the tank, allowing the user to make their own waves.

<br />

![The water behaving on its own](images/calm.png)

In this example FLIP simulator, the black box represents the tank storing the water, and the red ball is the object used to splash the water around. Without the ball's interration, the water's natural behavior is to generate small waves at the surface. The blue particles indicate higher density/lower velocity, and white indicates lower density/higher velocity.

<br />

![Waves caused by using the object to splash water around](images/waves.png)

<br />

After using the ball to splash the water around the tank, we observe large waves as the fluid crashes against itself and the walls. Due to the increased velocity, we see more white particles.

<br />
<br />

### Implementation
Our project is a recreation of a FLIP water simulator - a type of fluid simulator that represents the fluid as particles, containing properties such as position, velocity, and density. To calculate fluid-like motion, every frame run through 4 steps: We (1) map the particle velocities onto a grid-based velocity field that overlays the simulation space, (2) complete the projection step which means iterravely solving the velocity calculations, (3) copy the new velocities from the grid back onto our particles, and then (4) simulate the result by advancing the simulation with a fixed time step (here we calculate for gravity/ external forces and render the output). 
Within the projection step in (2) is where most of the fluid logic takes place: After converting dividing particle velocity into cells on a grid, we then calculate the cells' velocities to be incompressible (which is a property of fluid dynamics that measures volume change as a response to a pressure), as well as applying boundary conditions.

We began our process of implementation by first making a top-down-design, where within draw() we represented the 4 main steps of our simulation as functions that were constructed later on. In the coding process, we first ensured that our particles were visible and obeying normal gravity, to which we then started implementing each of the 4 steps one by one.

<br />

![our fluid sim, normal water behavior](images/p5js_sim.gif)

Our fluid simulator (this is the fluid's normal behavior of assuming the shape of its container.)

<br />

![our fluid sim, interaction behavior](images/p5js_waves.gif)

Our interraction features. Here, the mouse controls a circle acting as a solid. In handpose mode, ml5.handpose will detect your index finger to be the mouse!

<br />

### Evaluation
We can base our evaluation based on the working FLIP simulators that exist (most of which don't use p5.js), and how well ours compares to theirs. In terms of the general physics, our simulator obeys the general newtonian physics and possesses fluid-like properties (some swirling/ waves). In implementing the 4-step FLIP logic, we initially ran into p5.js specific problems/ malfunctionings (the inverted y axis, weird compiler issues) toward the end, and most of our time was spent searching for these bugs and making smaller adjustments. Other than that, our end product very much resembles a standard FLIP fluid simulator: Our water fills the container and waves/vortexes properly crash into themselves, particles change color based on velocity, and our framerate seems to be operating as well as p5 can handle. Additionally, we implemented mouse interration where moving the cursor can splash water around, and we also included ml5's handpose library so when handpose mode is selected, a hand can instead serve as the mouse to then move the water around.
