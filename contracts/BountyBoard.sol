// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract BountyBoard {
    struct Task {
        address creator;
        string description;
        uint256 amount;
        address token; // USDC address
        bool active;
        uint256 timestamp;
    }

    uint256 public nextTaskId;
    mapping(uint256 => Task) public tasks;

    event TaskPosted(uint256 indexed taskId, address indexed creator, uint256 amount, string description);
    event SolutionSubmitted(uint256 indexed taskId, address indexed solver, string solutionHash);
    event BountyReleased(uint256 indexed taskId, address indexed solver, uint256 amount);
    event BountyReclaimed(uint256 indexed taskId, uint256 amount);
    event SolutionRejected(uint256 indexed taskId, address indexed solver, string reason);

    function postTask(address _token, uint256 _amount, string calldata _description) external {
        require(_amount > 0, "Amount must be > 0");
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);

        tasks[nextTaskId] = Task({
            creator: msg.sender,
            description: _description,
            amount: _amount,
            token: _token,
            active: true,
            timestamp: block.timestamp
        });

        emit TaskPosted(nextTaskId, msg.sender, _amount, _description);
        nextTaskId++;
    }

    function submitSolution(uint256 _taskId, string calldata _solutionHash) external {
        require(tasks[_taskId].active, "Task not active");
        emit SolutionSubmitted(_taskId, msg.sender, _solutionHash);
    }

    function releaseBounty(uint256 _taskId, address _solver) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.creator, "Only creator");
        require(task.active, "Task not active");

        task.active = false;
        IERC20(task.token).transfer(_solver, task.amount);

        emit BountyReleased(_taskId, _solver, task.amount);
    }

    function reclaimBounty(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.creator, "Only creator");
        require(task.active, "Task not active");
        // Simple timeout: 7 days
        require(block.timestamp > task.timestamp + 7 days, "Timelock active");

        task.active = false;
        IERC20(task.token).transfer(task.creator, task.amount);

        emit BountyReclaimed(_taskId, task.amount);
    }

    function rejectSolution(uint256 _taskId, address _solver, string calldata _reason) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.creator, "Only creator");
        require(task.active, "Task not active");
        
        emit SolutionRejected(_taskId, _solver, _reason);
    }
}
