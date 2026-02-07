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
        uint256 stakeAmount; // New: Worker must stake this amount
        address token; // USDC address
        bool active;
        uint256 timestamp;
    }

    uint256 public nextTaskId;
    mapping(uint256 => Task) public tasks;

    event TaskPosted(uint256 indexed taskId, address indexed creator, uint256 amount, uint256 stakeAmount, string description);
    event SolutionSubmitted(uint256 indexed taskId, address indexed solver, string solutionHash);
    event BountyReleased(uint256 indexed taskId, address indexed solver, uint256 amount, uint256 stakeReturn);
    event BountyReclaimed(uint256 indexed taskId, uint256 amount);
    event SolutionRejected(uint256 indexed taskId, address indexed solver, string reason, uint256 stakeSlashed);

    function postTask(address _token, uint256 _amount, uint256 _stakeAmount, string calldata _description) external {
        require(_amount > 0, "Amount must be > 0");
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);

        tasks[nextTaskId] = Task({
            creator: msg.sender,
            description: _description,
            amount: _amount,
            stakeAmount: _stakeAmount,
            token: _token,
            active: true,
            timestamp: block.timestamp
        });

        emit TaskPosted(nextTaskId, msg.sender, _amount, _stakeAmount, _description);
        nextTaskId++;
    }

    function submitSolution(uint256 _taskId, string calldata _solutionHash) external {
        Task storage task = tasks[_taskId];
        require(task.active, "Task not active");
        
        // Staking Logic: Worker must transfer stake to contract
        if (task.stakeAmount > 0) {
            IERC20(task.token).transferFrom(msg.sender, address(this), task.stakeAmount);
        }

        emit SolutionSubmitted(_taskId, msg.sender, _solutionHash);
    }

    function releaseBounty(uint256 _taskId, address _solver) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.creator, "Only creator");
        require(task.active, "Task not active");

        task.active = false;
        
        // Payout: Bounty + Return Stake
        uint256 totalPayout = task.amount + task.stakeAmount;
        IERC20(task.token).transfer(_solver, totalPayout);

        emit BountyReleased(_taskId, _solver, task.amount, task.stakeAmount);
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
        
        // Slashing: Stake goes to Creator (as compensation for time waste)
        if (task.stakeAmount > 0) {
            IERC20(task.token).transfer(task.creator, task.stakeAmount);
        }
        
        emit SolutionRejected(_taskId, _solver, _reason, task.stakeAmount);
    }
}
