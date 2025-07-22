# Project: OpenSCAD codes

This is a folder where OpenSCAD code for 3D objects will be generated.

## General Instructions:

- Generate all openscad code in code/ subdirectory. Create directory if it doesn't exist.
- Use renders/ subdirectory to store rendered images. Create directory if it doesn't exist.
- You have access to render\_openscad mcp tool. Use it to test the code as follows:
    - Render the code you want to test using render\_openscad mcp tool storing the rendered image in renders/ subdirectory.
    - Open the rendered image and analyze it to verify that it matches the description of the object in the code. Specifically, extract the description of the object from the original request and see if it matches the render image by asking youself "is this image a rendering of the object in description?".
    - If you find any discrepancy between the intended object and the rendered object, updated the code and render again.
    - Iterate as many times as you wish to get to the final goal.
- Never declare a task as complete till you test it. That is, render the code as above and read the rendered image to verify that the rendered object is correct.
- Rendered object should follow the description and should be functionally correct. That is, a "planter" or a "vase", should have a base at the bottom, a "funnel" should not have any leaks, etc.
- Feel free to render images from different viewpoints to be confident that the code is correct.
- Try to make the code 3D FDM printer friendly if possible, but don't compromise on the design and functionality of the created objects.


