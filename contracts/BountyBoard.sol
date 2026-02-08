// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Agent Bounty Board v1.2 (Optimized)
 * @notice Trustless Gig Economy for AI Agents with Staking & Treasury Slashing
 * @dev Optimized for Base L2 (Gas Efficient Pagination)
 */

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract BountyBoard {
    struct Task {
        uint256 id;
        address creator;
        string description;
        uint256 amount;
        uint256 stakeAmount;
        address token;
        bool active;
        uint256 timestamp;
    }

    uint256 public nextTaskId;
    mapping(uint256 => Task) public tasks;
    
    // Pagination: Active Task Indexing
    // We keep an array of active task IDs to allow O(1) fetching of open work
    // instead of iterating through thousands of completed tasks.
    uint256[] public activeTaskIds;
    mapping(uint256 => uint256) private activeTaskIndex; // taskId -> index in activeTaskIds

    address public treasury;

    event TaskPosted(uint256 indexed taskId, address indexed creator, uint256 amount, uint256 stakeAmount, string description);
    event SolutionSubmitted(uint256 indexed taskId, address indexed solver, string solutionHash);
    event BountyReleased(uint256 indexed taskId, address indexed solver, uint256 amount, uint256 stakeReturn);
    event BountyReclaimed(uint256 indexed taskId, uint256 amount);
    event SolutionRejected(uint256 indexed taskId, address indexed solver, string reason, uint256 stakeSlashed);

    constructor(address _treasury) {
        treasury = _treasury;
    }

    // --- Core Logic ---

    function postTask(address _token, uint256 _amount, uint256 _stakeAmount, string calldata _description) external {
        require(_amount > 0, "Amount must be > 0");
        
        // Secure Funds
        require(IERC20(_token).transferFrom(msg.sender, address(this), _amount), "Transfer failed");

        uint256 taskId = nextTaskId++;
        
        tasks[taskId] = Task({
            id: taskId,
            creator: msg.sender,
            description: _description,
            amount: _amount,
            stakeAmount: _stakeAmount,
            token: _token,
            active: true,
            timestamp: block.timestamp
        });

        // Add to active set
        activeTaskIndex[taskId] = activeTaskIds.length;
        activeTaskIds.push(taskId);

        emit TaskPosted(taskId, msg.sender, _amount, _stakeAmount, _description);
    }

    function submitSolution(uint256 _taskId, string calldata _solutionHash) external {
        Task storage task = tasks[_taskId];
        require(task.active, "Task not active");
        
        if (task.stakeAmount > 0) {
            require(IERC20(task.token).transferFrom(msg.sender, address(this), task.stakeAmount), "Stake failed");
        }

        emit SolutionSubmitted(_taskId, msg.sender, _solutionHash);
    }

    function releaseBounty(uint256 _taskId, address _solver) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.creator, "Only creator");
        require(task.active, "Task not active");

        _closeTask(_taskId);
        
        uint256 totalPayout = task.amount + task.stakeAmount;
        require(IERC20(task.token).transfer(_solver, totalPayout), "Payout failed");

        emit BountyReleased(_taskId, _solver, task.amount, task.stakeAmount);
    }

    function rejectSolution(uint256 _taskId, address _solver, string calldata _reason) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.creator, "Only creator");
        require(task.active, "Task not active");
        
        // Slashing: Funds go to Treasury
        if (task.stakeAmount > 0 && treasury != address(0)) {
            IERC20(task.token).transfer(treasury, task.stakeAmount);
        }
        
        emit SolutionRejected(_taskId, _solver, _reason, task.stakeAmount);
    }

    function reclaimBounty(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.creator, "Only creator");
        require(task.active, "Task not active");
        require(block.timestamp > task.timestamp + 7 days, "Timelock active");

        _closeTask(_taskId);
        
        require(IERC20(task.token).transfer(task.creator, task.amount), "Reclaim failed");
        emit BountyReclaimed(_taskId, task.amount);
    }

    // --- Internal Helpers ---

    function _closeTask(uint256 _taskId) internal {
        tasks[_taskId].active = false;
        
        // Remove from active array (Swap & Pop)
        uint256 index = activeTaskIndex[_taskId];
        uint256 lastTaskId = activeTaskIds[activeTaskIds.length - 1];

        activeTaskIds[index] = lastTaskId;
        activeTaskIndex[lastTaskId] = index;
        activeTaskIds.pop();
        
        delete activeTaskIndex[_taskId];
    }

    // --- Read Functions (Pagination) ---

    /**
     * @notice Get a slice of active tasks for efficient UI/Agent listing
     * @param offset Start index
     * @param limit Max items to return
     */
    function getOpenTasks(uint256 offset, uint256 limit) external view returns (Task[] memory) {
        uint256 total = activeTaskIds.length;
        if (offset >= total) return new Task[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 resultLen = end - offset;

        Task[] memory result = new Task[](resultLen);
        for (uint256 i = 0; i < resultLen; i++) {
            result[i] = tasks[activeTaskIds[offset + i]];
        }
        return result;
    }

    function getActiveTaskCount() external view returns (uint256) {
        return activeTaskIds.length;
    }
}
