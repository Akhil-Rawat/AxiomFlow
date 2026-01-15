// ==========================================
// AxiomFlow - Web3 Integration
// ==========================================

// Contract addresses (will be set after deployment)
let CONTRACT_ADDRESSES = {
  lendingVault: "",
  yieldEngine: "",
  mockRWA: "",
};

// ABIs (simplified - only including functions we need)
const LENDING_VAULT_ABI = [
  "function depositCollateral(uint256 amount) external",
  "function borrow(uint256 amount) external",
  "function positions(address) view returns (uint256 collateralAmount, uint256 borrowedAmount, uint256 remainingDebt)",
  "function totalDebt() view returns (uint256)",
  "function fundVault() external payable",
  "function owner() view returns (address)",
  "event CollateralDeposited(address indexed user, uint256 amount)",
  "event Borrowed(address indexed user, uint256 amount)",
  "event YieldReceived(uint256 amount)",
  "event DebtReduced(address indexed user, uint256 amount)",
  "event AutomatedPayment(uint256 totalYield, uint256 usersProcessed)",
];

const YIELD_ENGINE_ABI = [
  "function generateYield() external",
  "function generateYieldAmount(uint256 amount) external",
  "event YieldGenerated(uint256 amount)",
];

const MOCK_RWA_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function mint(address to, uint256 amount) external",
  "function owner() view returns (address)",
];

// Global variables
let provider;
let signer;
let userAddress;
let lendingVaultContract;
let yieldEngineContract;
let mockRWAContract;
let isOwner = false;

// Initialize on page load
window.addEventListener("load", async () => {
  await loadContractAddresses();
  setupEventListeners();
  checkWalletConnection();
});

// Load contract addresses from deployment
async function loadContractAddresses() {
  try {
    const response = await fetch("deployment.json");
    if (response.ok) {
      const deployment = await response.json();
      CONTRACT_ADDRESSES = deployment;
      console.log("📝 Loaded contract addresses:", CONTRACT_ADDRESSES);
    } else {
      console.warn(
        "⚠️ deployment.json not found. Please deploy contracts first."
      );
      addEventLog(
        "WARNING",
        "Contract addresses not found. Deploy contracts first."
      );
    }
  } catch (error) {
    console.error("Error loading contract addresses:", error);
  }
}

// Setup event listeners
function setupEventListeners() {
  document
    .getElementById("connectWallet")
    .addEventListener("click", connectWallet);
  document
    .getElementById("depositBtn")
    .addEventListener("click", handleDeposit);
  document.getElementById("borrowBtn").addEventListener("click", handleBorrow);
  document
    .getElementById("yieldBtn")
    .addEventListener("click", handleYieldGeneration);

  // Admin controls
  document
    .getElementById("fundVaultBtn")
    ?.addEventListener("click", handleFundVault);
  document
    .getElementById("fundYieldBtn")
    ?.addEventListener("click", handleFundYield);
  document
    .getElementById("mintRWABtn")
    ?.addEventListener("click", handleMintRWA);
}

// Check if wallet is already connected
async function checkWalletConnection() {
  if (typeof window.ethereum !== "undefined") {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (accounts.length > 0) {
        await connectWallet();
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error);
    }
  }
}

// Connect wallet
async function connectWallet() {
  try {
    if (typeof window.ethereum === "undefined") {
      showMessage("Please install MetaMask to use this application!", "error");
      return;
    }

    // Request account access
    const accounts = await window.ethereum.request({ 
      method: "eth_requestAccounts" 
    });

    if (!accounts || accounts.length === 0) {
      showMessage("No accounts found. Please unlock MetaMask.", "error");
      return;
    }

    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    // Check network (Mantle Sepolia)
    const network = await provider.getNetwork();
    if (network.chainId !== 5003) {
      showMessage(
        "Please switch to Mantle Sepolia Testnet (Chain ID: 5003)",
        "error"
      );
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x138B' }], // 5003 in hex
        });
      } catch (switchError) {
        // Chain doesn't exist, add it
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x138B',
                chainName: 'Mantle Sepolia Testnet',
                nativeCurrency: {
                  name: 'MNT',
                  symbol: 'MNT',
                  decimals: 18
                },
                rpcUrls: ['https://rpc.sepolia.mantle.xyz'],
                blockExplorerUrls: ['https://sepolia.mantlescan.xyz']
              }]
            });
          } catch (addError) {
            showMessage("Failed to add Mantle Sepolia network: " + addError.message, "error");
            return;
          }
        } else {
          showMessage("Failed to switch network: " + switchError.message, "error");
          return;
        }
      }
    }

    // Initialize contracts
    if (CONTRACT_ADDRESSES.lendingVault) {
      lendingVaultContract = new ethers.Contract(
        CONTRACT_ADDRESSES.lendingVault,
        LENDING_VAULT_ABI,
        signer
      );

      yieldEngineContract = new ethers.Contract(
        CONTRACT_ADDRESSES.yieldEngine,
        YIELD_ENGINE_ABI,
        signer
      );

      mockRWAContract = new ethers.Contract(
        CONTRACT_ADDRESSES.mockRWA,
        MOCK_RWA_ABI,
        signer
      );

      // Check if user is owner
      const owner = await lendingVaultContract.owner();
      isOwner = owner.toLowerCase() === userAddress.toLowerCase();

      // Setup event listeners
      setupContractEventListeners();

      // Update UI
      await updateUI();

      document.getElementById("connectWallet").textContent = "CONNECTED";
      document.getElementById("connectWallet").disabled = true;

      showMessage("Wallet connected successfully!", "success");
      addEventLog(
        "CONNECTION",
        `Wallet connected: ${formatAddress(userAddress)}`
      );
    } else {
      showMessage(
        "Contract addresses not loaded. Please deploy contracts first.",
        "error"
      );
    }
  } catch (error) {
    console.error("Connection error:", error);
    showMessage("Failed to connect wallet: " + error.message, "error");
  }
}

// Setup contract event listeners
function setupContractEventListeners() {
  // Listen for CollateralDeposited events
  lendingVaultContract.on("CollateralDeposited", (user, amount) => {
    if (user.toLowerCase() === userAddress.toLowerCase()) {
      addEventLog(
        "DEPOSIT",
        `Deposited ${ethers.utils.formatEther(amount)} RWA`
      );
      updateUI();
    }
  });

  // Listen for Borrowed events
  lendingVaultContract.on("Borrowed", (user, amount) => {
    if (user.toLowerCase() === userAddress.toLowerCase()) {
      addEventLog("BORROW", `Borrowed ${ethers.utils.formatEther(amount)} MNT`);
      updateUI();
    }
  });

  // Listen for YieldReceived events
  lendingVaultContract.on("YieldReceived", (amount) => {
    addEventLog("YIELD", `${ethers.utils.formatEther(amount)} MNT received`);
    updateUI();
  });

  // Listen for DebtReduced events
  lendingVaultContract.on("DebtReduced", (user, amount) => {
    if (user.toLowerCase() === userAddress.toLowerCase()) {
      addEventLog(
        "REDUCTION",
        `Debt reduced by ${ethers.utils.formatEther(amount)} MNT`
      );
      updateUI();
    }
  });

  // Listen for AutomatedPayment events
  lendingVaultContract.on("AutomatedPayment", (totalYield, usersProcessed) => {
    addEventLog(
      "PAYMENT",
      `${ethers.utils.formatEther(
        totalYield
      )} MNT distributed to ${usersProcessed.toString()} borrowers`
    );
    updateUI();
  });
}

// Update UI with current data
async function updateUI() {
  try {
    // Update wallet info
    document.getElementById("walletStatus").style.display = "block";
    document.getElementById("walletAddress").textContent =
      formatAddress(userAddress);

    // Get balances
    const mntBalance = await provider.getBalance(userAddress);
    const rwaBalance = await mockRWAContract.balanceOf(userAddress);

    document.getElementById("mntBalance").textContent =
      parseFloat(ethers.utils.formatEther(mntBalance)).toFixed(4) + " MNT";
    document.getElementById("rwaBalance").textContent =
      parseFloat(ethers.utils.formatEther(rwaBalance)).toFixed(4) + " RWA";
    document.getElementById("availableRWA").textContent = parseFloat(
      ethers.utils.formatEther(rwaBalance)
    ).toFixed(4);

    // Get user position
    const position = await lendingVaultContract.positions(userAddress);
    const collateral = ethers.utils.formatEther(position.collateralAmount);
    const borrowed = ethers.utils.formatEther(position.borrowedAmount);
    const debt = ethers.utils.formatEther(position.remainingDebt);

    document.getElementById("userCollateral").textContent =
      parseFloat(collateral).toFixed(4) + " RWA";
    document.getElementById("userBorrowed").textContent =
      parseFloat(borrowed).toFixed(4) + " MNT";
    document.getElementById("userDebt").textContent =
      parseFloat(debt).toFixed(4) + " MNT";

    // Calculate debt paid by yield
    const debtPaid = parseFloat(borrowed) - parseFloat(debt);
    document.getElementById("debtPaid").textContent =
      debtPaid.toFixed(4) + " MNT";

    // Calculate max borrow (50% of collateral value)
    const maxBorrowAmount = parseFloat(collateral) * 0.5;
    document.getElementById("maxBorrow").textContent =
      maxBorrowAmount.toFixed(4);

    // Get total stats
    const totalDebt = await lendingVaultContract.totalDebt();
    document.getElementById("totalTVL").textContent =
      parseFloat(ethers.utils.formatEther(totalDebt)).toFixed(2) + " MNT";

    // Get yield engine balance
    const yieldBalance = await provider.getBalance(
      CONTRACT_ADDRESSES.yieldEngine
    );
    document.getElementById("availableYield").textContent =
      parseFloat(ethers.utils.formatEther(yieldBalance)).toFixed(4) + " MNT";

    // Show admin section if owner
    if (isOwner) {
      document.getElementById("adminSection").style.display = "block";
    }
  } catch (error) {
    console.error("Error updating UI:", error);
  }
}

// Handle deposit
async function handleDeposit() {
  const amountInput = document.getElementById("depositAmount");
  const amount = amountInput.value;

  if (!amount || parseFloat(amount) <= 0) {
    showMessage("Please enter a valid amount", "error");
    return;
  }

  try {
    const amountWei = ethers.utils.parseEther(amount);

    // Check allowance
    const allowance = await mockRWAContract.allowance(
      userAddress,
      CONTRACT_ADDRESSES.lendingVault
    );

    // Approve if needed
    if (allowance.lt(amountWei)) {
      showMessage("Approving RWA tokens...", "info");
      const approveTx = await mockRWAContract.approve(
        CONTRACT_ADDRESSES.lendingVault,
        ethers.constants.MaxUint256
      );
      await approveTx.wait();
      showMessage("RWA tokens approved!", "success");
    }

    // Deposit
    showMessage("Depositing collateral...", "info");
    const tx = await lendingVaultContract.depositCollateral(amountWei);
    await tx.wait();

    showMessage(`Successfully deposited ${amount} RWA!`, "success");
    amountInput.value = "";
    await updateUI();
  } catch (error) {
    console.error("Deposit error:", error);
    showMessage("Deposit failed: " + error.message, "error");
  }
}

// Handle borrow
async function handleBorrow() {
  const amountInput = document.getElementById("borrowAmount");
  const amount = amountInput.value;

  if (!amount || parseFloat(amount) <= 0) {
    showMessage("Please enter a valid amount", "error");
    return;
  }

  try {
    showMessage("Borrowing MNT...", "info");
    const amountWei = ethers.utils.parseEther(amount);
    const tx = await lendingVaultContract.borrow(amountWei);
    await tx.wait();

    showMessage(`Successfully borrowed ${amount} MNT!`, "success");
    amountInput.value = "";
    await updateUI();
  } catch (error) {
    console.error("Borrow error:", error);
    showMessage("Borrow failed: " + error.message, "error");
  }
}

// Handle yield generation
async function handleYieldGeneration() {
  try {
    showMessage("Generating and distributing yield...", "info");
    const tx = await yieldEngineContract.generateYield();
    await tx.wait();

    showMessage("Yield distributed successfully!", "success");
    await updateUI();
  } catch (error) {
    console.error("Yield generation error:", error);
    showMessage("Yield generation failed: " + error.message, "error");
  }
}

// Handle fund vault (admin)
async function handleFundVault() {
  const amountInput = document.getElementById("fundAmount");
  const amount = amountInput.value;

  if (!amount || parseFloat(amount) <= 0) {
    showMessage("Please enter a valid amount", "error");
    return;
  }

  try {
    showMessage("Funding vault...", "info");
    const tx = await lendingVaultContract.fundVault({
      value: ethers.utils.parseEther(amount),
    });
    await tx.wait();

    showMessage(`Successfully funded vault with ${amount} MNT!`, "success");
    amountInput.value = "";
    await updateUI();
  } catch (error) {
    console.error("Fund vault error:", error);
    showMessage("Funding failed: " + error.message, "error");
  }
}

// Handle fund yield engine (admin)
async function handleFundYield() {
  const amountInput = document.getElementById("fundYieldAmount");
  const amount = amountInput.value;

  if (!amount || parseFloat(amount) <= 0) {
    showMessage("Please enter a valid amount", "error");
    return;
  }

  try {
    showMessage("Funding yield engine...", "info");
    const tx = await signer.sendTransaction({
      to: CONTRACT_ADDRESSES.yieldEngine,
      value: ethers.utils.parseEther(amount),
    });
    await tx.wait();

    showMessage(
      `Successfully funded yield engine with ${amount} MNT!`,
      "success"
    );
    amountInput.value = "";
    await updateUI();
  } catch (error) {
    console.error("Fund yield error:", error);
    showMessage("Funding failed: " + error.message, "error");
  }
}

// Handle mint RWA (admin)
async function handleMintRWA() {
  const addressInput = document.getElementById("mintAddress");
  const amountInput = document.getElementById("mintAmount");
  const address = addressInput.value;
  const amount = amountInput.value;

  if (!address || !amount || parseFloat(amount) <= 0) {
    showMessage("Please enter valid address and amount", "error");
    return;
  }

  try {
    showMessage("Minting RWA tokens...", "info");
    const tx = await mockRWAContract.mint(
      address,
      ethers.utils.parseEther(amount)
    );
    await tx.wait();

    showMessage(
      `Successfully minted ${amount} RWA to ${formatAddress(address)}!`,
      "success"
    );
    addressInput.value = "";
    amountInput.value = "";
    await updateUI();
  } catch (error) {
    console.error("Mint error:", error);
    showMessage("Minting failed: " + error.message, "error");
  }
}

// Utility functions
function formatAddress(address) {
  return `${address.substring(0, 6)}...${address.substring(38)}`;
}

function showMessage(message, type) {
  // Remove existing messages
  const existingMessages = document.querySelectorAll(".message");
  existingMessages.forEach((msg) => msg.remove());

  // Create new message
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = message;

  // Insert at the top of main section
  const mainSection = document.querySelector(".main-section .container");
  mainSection.insertBefore(messageDiv, mainSection.firstChild);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    messageDiv.remove();
  }, 5000);
}

function addEventLog(type, details) {
  const eventLog = document.getElementById("eventLog");

  // Remove empty state if present
  const emptyState = eventLog.querySelector(".empty-state");
  if (emptyState) {
    emptyState.remove();
  }

  // Create event item
  const eventItem = document.createElement("div");
  eventItem.className = "event-item";

  const eventContent = document.createElement("div");
  const eventType = document.createElement("div");
  eventType.className = "event-type";
  eventType.textContent = type;

  const eventDetails = document.createElement("div");
  eventDetails.className = "event-details";
  eventDetails.textContent = details;

  eventContent.appendChild(eventType);
  eventContent.appendChild(eventDetails);

  const eventTime = document.createElement("div");
  eventTime.className = "event-time";
  eventTime.textContent = new Date().toLocaleTimeString();

  eventItem.appendChild(eventContent);
  eventItem.appendChild(eventTime);

  // Add to top of log
  eventLog.insertBefore(eventItem, eventLog.firstChild);

  // Keep only last 10 events
  while (eventLog.children.length > 10) {
    eventLog.removeChild(eventLog.lastChild);
  }
}

// Handle account changes
if (typeof window.ethereum !== "undefined") {
  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length === 0) {
      location.reload();
    } else {
      location.reload();
    }
  });

  window.ethereum.on("chainChanged", () => {
    location.reload();
  });
}
