# Game Refactor Design Document

## Project
Refactor the monolithic `Game` class in `js/game.js` into modular components.

## Current State
- `js/game.js` is a single monolithic class containing simulation, rendering, and controller logic
- Performance bottlenecks: particle system, enemy ticking
- Game balance issues: vase mechanics, mower automation, sun collection

## Goals
1. Split `Game` class into three modules:
   - `Game.Simulation` - state management (enemies, plants, waves)
   - `Game.Renderer` - canvas drawing logic
   - `Game.Controller` - input handling and event dispatch
2. Implement a particle pool to prevent memory leaks from unmanaged particle creation
3. Enhance vase mechanics with better visual feedback and interaction
4. Add spatial partitioning to optimize enemy ticking performance

## Approaches

### Approach 1: Split Game class into three modules (Recommended)
- **Pros**: Clean separation of concerns, easier testing, better performance isolation
- **Cons**: Requires careful API design between modules, potential for increased complexity in data sharing
- **Implementation**:
  - `Game.Simulation`: Manages game state (enemies, plants, waves, scores)
  - `Game.Renderer`: Handles all canvas drawing, particle systems, UI rendering
  - `Game.Controller`: Processes input, dispatches events, coordinates between modules

### Approach 2: Keep Game class but refactor internally
- **Pros**: Simpler API, less risk of breaking changes
- **Cons**: Doesn't fully address the monolithic nature, still has performance issues
- **Implementation**: Internal refactoring with private helper classes

### Approach 3: Incremental refactoring
- **Pros**: Lower risk, can be done incrementally
- **Cons**: May not achieve the desired clean architecture, longer timeline

## Recommended Approach
**Approach 1** - Split into three modules. This provides the best long-term maintainability and performance characteristics. The separation allows:
- Simulation logic to run independently (better optimization opportunities)
- Rendering to be isolated from game logic (easier to debug visual issues)
- Controller to handle input without being tied to rendering concerns

## Implementation Plan
1. Create `Game.Simulation.js` - state management
2. Create `Game.Renderer.js` - canvas drawing and particle system
3. Create `Game.Controller.js` - input handling and event coordination
4. Implement particle pool in `Game.Renderer`
5. Enhance vase mechanics in `Game.Simulation`
6. Add spatial partitioning in `Game.Simulation` for enemy ticking

## Design Decisions
- Particle pool: Pre-allocate a fixed number of particle objects to avoid garbage collection pressure
- Spatial partitioning: Use a simple grid-based approach for enemy ticking optimization
- Vase mechanics: Add visual feedback (glow, particle effects) when interacting with vases

## Risks
- Data consistency between modules (must use proper state management)
- Performance overhead of inter-module communication
- Potential API changes that affect existing code

## Next Steps
1. Write the design document (done)
2. Get approval from the human partner
3. Begin implementation with the three-module architecture
