# Technical specifications

All the general technical specification are contained here [technical-specifications.md](../backlog/technical-specs.md). 
When you need to run scripts prefer powershell core that can work both in windows and unix systems.
All features are contained into backlog/Features folder. Features are ordered, each feature contains a series of sub tasks to implement the feature. 

# MUST TO FOLLOW RULES

- After each task ensure that all the tests are passing
- Always try to write tests for each new piece of code so we have all code testable.
- If you change the code outside the feature you are working on, always check the ./backlog/Features folder to understand if you need to update the feature reflecting the new changes

## Feature layout 

- backlog/featurelist.md: A list of all the features
- backlog/Features: Contains all features, one directory for each feature, with the number of the feature as first part of directory names
- backlog/Features/X. Feature name: Contains task files that implement that features, ordered by the number at the beginning of the file name

## Implementation rules

When you are asked to implement a feature you must follow these rules:

- locate the feature number into the folder backlog/Features as for previous layout 
- Inside the feature folder there are task instruction files.
- Each task is a markdown file with instruction of what to do
- Proceed to the implementation
- After each single feature you should stop and let the user refine the code
- once the user commit the changes he/she will give you the go-ahead to proceed with the next feature
- If you added new npm or script or other command, please run to verify that they can run correctly