# Technical specifications

All the general technical specification are contained here [technical-specifications.md](../backlog/technical-specs.md). 
When you need to run scripts prefer powershell core that can work both in windows and unix systems.

# MUST TO FOLLOW RULES

- After each task ensure that all the tests are passing
- Always try to write tests for each new piece of code so we have all code testable.

## Implementation rules

When you are asked to implement a feature you must follow these rules:

- locate the feature number into the folder backlog/Features   
- Inside the feature folder there are numbered features
- Each feature contains a markdown file with the description of the feature and the instructions to implement it
- Proceed to the implementation
- After each single feature you should stop and let the user refine the code
- once the user commit the changes he/she will give you the go-ahead to proceed with the next feature
- If you added new npm or script or other command, please run to verify that they can run correctly