# MNT Lending Frontend

A modern DeFi lending platform frontend inspired by Aura Bora's bold, clean design aesthetic.

## Features

- **Wallet Connection**: Connect MetaMask to Mantle Sepolia testnet
- **Collateral Deposit**: Deposit RWA tokens as collateral
- **Borrowing**: Borrow MNT at 50% LTV ratio
- **Yield Distribution**: Automated debt reduction through yield
- **Real-time Updates**: Live balance and position tracking
- **Admin Controls**: Owner-only functions for vault management

## Design Philosophy

Inspired by [Aura Bora](https://aurabora.com/), the frontend features:

- Bold, monospace typography
- Clean color palette with green accents
- Strong borders and shadows for depth
- Playful, energetic layout
- Clear call-to-action buttons

## Tech Stack

- **HTML5**: Semantic structure
- **CSS3**: Custom styling with CSS Grid/Flexbox
- **JavaScript (ES6+)**: Web3 interactions
- **Ethers.js v5**: Ethereum library for wallet and contract interaction

## Setup

1. **Deploy Contracts**:

   ```bash
   npx hardhat run scripts/deploy.js --network mantle-sepolia
   ```

   This will automatically create `deployment.json` in the frontend folder.

2. **Serve Frontend**:

   ```bash
   # Using Python
   cd frontend
   python -m http.server 8000

   # Using Node.js
   npx http-server frontend -p 8000

   # Using PHP
   cd frontend
   php -S localhost:8000
   ```

3. **Access Application**:
   Open `http://localhost:8000` in your browser

## Configuration

### Network Requirements

- **Network**: Mantle Sepolia Testnet
- **Chain ID**: 5003
- **RPC URL**: https://rpc.sepolia.mantle.xyz
- **Currency**: MNT

### MetaMask Setup

Add Mantle Sepolia to MetaMask:

1. Open MetaMask
2. Click Network dropdown
3. Add Network manually:
   - Network Name: Mantle Sepolia
   - RPC URL: https://rpc.sepolia.mantle.xyz
   - Chain ID: 5003
   - Currency Symbol: MNT
   - Block Explorer: https://sepolia.mantlescan.xyz

## File Structure

```
frontend/
├── index.html          # Main HTML structure
├── styles.css          # Aura Bora-inspired styles
├── app.js              # Web3 integration & contract interactions
├── deployment.json     # Auto-generated contract addresses
└── README.md          # This file
```

## Usage

### For Users

1. **Connect Wallet**: Click "CONNECT WALLET" button
2. **Deposit Collateral**: Enter RWA amount and deposit
3. **Borrow MNT**: Enter amount (up to 50% of collateral value)
4. **Generate Yield**: Click to distribute yield and reduce debt

### For Admins (Contract Owner)

Additional controls appear automatically:

- **Fund Vault**: Add MNT to lending pool
- **Fund Yield Engine**: Add MNT for yield generation
- **Mint RWA**: Create new RWA tokens for testing

## Key Functions

### User Functions

- `depositCollateral(amount)`: Deposit RWA as collateral
- `borrow(amount)`: Borrow MNT against collateral
- `generateYield()`: Trigger yield distribution

### View Functions

- `positions(address)`: Get user position details
- `totalDebt()`: Get platform total debt
- Balance queries for MNT and RWA

## Events & Logging

The application tracks and displays:

- Collateral deposits
- MNT borrows
- Yield distributions
- Debt reductions
- Automated payments

## Styling

### Color Palette

- Primary Green: `#2d5016`
- Bright Green: `#4a7c2c`
- Accent Pink: `#ff6b9d`
- Accent Orange: `#ff8c42`
- Cream: `#fef8f3`

### Typography

- Display Font: Courier New (monospace)
- Body Font: System fonts (-apple-system, etc.)
- Bold, uppercase headings
- High letter-spacing for emphasis

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Brave

Requires:

- Modern browser with ES6+ support
- MetaMask or compatible Web3 wallet

## Development

### Modifying Contract Addresses

If you redeploy contracts, the `deployment.json` file will be automatically updated. If manual changes are needed:

```json
{
  "lendingVault": "0x...",
  "yieldEngine": "0x...",
  "mockRWA": "0x..."
}
```

### Adding New Features

1. Update `app.js` with new contract functions
2. Add UI elements in `index.html`
3. Style with `styles.css` following the design system

## Troubleshooting

### Wallet Won't Connect

- Ensure MetaMask is installed
- Check you're on Mantle Sepolia (Chain ID: 5003)
- Refresh the page

### Transactions Fail

- Verify you have enough MNT for gas
- Check contract addresses in `deployment.json`
- Ensure contracts are deployed

### Display Issues

- Clear browser cache
- Check console for errors (F12)
- Verify `deployment.json` exists

## Security Notes

⚠️ **Testnet Only**: This is for Mantle Sepolia testnet. Do not use with real funds.

- Always verify transaction details before signing
- Never share private keys
- Use a separate wallet for testing
- Be aware of unlimited approvals

## Credits

Design inspired by [Aura Bora](https://aurabora.com/) - Sparkling water made from herbs, fruits & flowers.

Built with ♥ for DeFi on Mantle.

## License

MIT
