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

For our project, we chose to recreate a fluid simulator entirely within p5.js. In general, fluid dynamics is a field with broad applications such as physics to computer graphics and visual arts. The reason we chose to solve this problem was our passion for physics applications within graphics animations. Additionally, we felt confident in our knowledge of p5.js, as well as our math backgrounds, to follow a general tutorial and write out calculations.


We chose to recreate a FLIP (Fluid-Implicit Particles) water simulator - a type of fluid sim that represents the fluid as particles, and to calculate fluid-like motion, every frame we map the particle velocities onto a grid, then calculate a velocity field using a projection step, and then copy the new velocities back onto the particles for each step. 

Within the projection step we run calculations to make the grid velocities incompressible (a property of fluid dynamics that measures volume change as a response to a pressure).

Representing everything in a velocity grid also meant we can distinguish between fluid and non-fluid grid cells, meaning we can model water and air respectively, as shown here:

(flip water pic here)

<br />
The way we implemented this was by drawing small fluid particles within a box containing the fluid, and making these into shapes within draw() was what our main visuals were. In the backend, the box was divided into a grid to use for our velocity calculations, which we treated as 2D arrays. We also needed to ensure this grid had boundaries representing the ends of the box, where our fluid would know it was touching a solid object, so we made flags representing 0 = wall and 1 = fluid.
