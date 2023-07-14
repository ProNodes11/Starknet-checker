import fs from 'fs'

let wallets = fs.readFileSync('wallet.txt', 'utf-8').split('\n').map(line => line.trim());
let currentTime = new Date().toLocaleTimeString(); 
let filename = 'results-'+ currentTime + '.csv'

async function fetchInfo(address, unicAddress) {
    try {
        const payload = '{"query":"query TransactionsTableQuery(\\n  $first: Int!\\n  $after: String\\n  $input: TransactionsInput!\\n) {\\n  ...TransactionsTablePaginationFragment_transactions_2DAjA4\\n}\\n\\nfragment TransactionsTableExpandedItemFragment_transaction on Transaction {\\n  entry_point_selector_name\\n  calldata_decoded\\n  entry_point_selector\\n  calldata\\n  initiator_address\\n  initiator_identifier\\n  main_calls {\\n    selector\\n    selector_name\\n    calldata_decoded\\n    selector_identifier\\n    calldata\\n    contract_address\\n    contract_identifier\\n    id\\n  }\\n}\\n\\nfragment TransactionsTablePaginationFragment_transactions_2DAjA4 on Query {\\n  transactions(first: $first, after: $after, input: $input) {\\n    edges {\\n      node {\\n        id\\n        ...TransactionsTableRowFragment_transaction\\n        __typename\\n      }\\n      cursor\\n    }\\n    pageInfo {\\n      endCursor\\n      hasNextPage\\n    }\\n  }\\n}\\n\\nfragment TransactionsTableRowFragment_transaction on Transaction {\\n  id\\n  transaction_hash\\n  block_number\\n  transaction_status\\n  transaction_type\\n  timestamp\\n  initiator_address\\n  initiator_identifier\\n  initiator {\\n    is_social_verified\\n    id\\n  }\\n  main_calls {\\n    selector_identifier\\n    id\\n  }\\n  ...TransactionsTableExpandedItemFragment_transaction\\n}\\n","variables":{"first":30,"after":null,"input":{"initiator_address":"' + address + '","sort_by":"timestamp","order_by":"desc","min_block_number":null,"max_block_number":null,"min_timestamp":null,"max_timestamp":null}}}';
        const balance_payload = '{"query":"query ERC20BalancesByOwnerAddressTableQuery(\\n  $input: ERC20BalancesByOwnerAddressInput!\\n) {\\n  erc20BalancesByOwnerAddress(input: $input) {\\n    id\\n    ...ERC20BalancesByOwnerAddressTableRowFragment_erc20Balance\\n  }\\n}\\n\\nfragment ERC20BalancesByOwnerAddressTableRowFragment_erc20Balance on ERC20Balance {\\n  id\\n  contract_address\\n  contract_erc20_identifier\\n  contract_erc20_contract {\\n    symbol\\n    is_social_verified\\n    icon_url\\n    id\\n  }\\n  balance_display\\n}\\n","variables":{"input":{"owner_address":"' + address + '"}}}';
        const headers = {
            'Authority': 'starkscan.stellate.sh',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
            'Content-Type': 'application/json',
            'Origin': 'https://starkscan.co',
            'Referer': 'https://starkscan.co/',
            'Sec-Ch-Ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"macOS"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
        };
        const response = await  fetch('https://api.starkscan.co/graphql', {
            method: 'POST',
            headers: headers,
            body: payload
        })
        // console.log(response)
        const balances_response = await  fetch('https://api.starkscan.co/graphql', {
            method: 'POST',
            headers: headers,
            body: balance_payload
        })
        let nonce
        let balanceString = ''
        const balances = await balances_response.json()
        for (let balance of balances.data.erc20BalancesByOwnerAddress) {
            balanceString += `${balance.contract_erc20_contract.symbol} ${balance.balance_display} | `;
        }
        const data = await response.json()
       
        let firstDay = '2053-05-19T15:51:55.000Z'
        let lastDay  = '2000-05-19T15:51:55.000Z'
        for (let tx of data.data.transactions.edges) {
            for (let resiever of tx.node.main_calls) {
                if (!unicAddress.includes(resiever.contract_address)) {
                    unicAddress.push(resiever.contract_address);
                }
            }
            let newDay = new Date(tx.node.timestamp * 1000)
            firstDay = new Date(firstDay);
            lastDay = new Date(lastDay);
            if (firstDay > newDay) {
                firstDay = newDay
            }
            if (lastDay < newDay) {
                lastDay = newDay
            }
            nonce = data.data.transactions.edges.length
        }
        console.log(balanceString)
        addRowToCSV(address, balanceString, nonce, unicAddress.length + 1, await formatDate(firstDay), await formatDate(lastDay),  await dateDiff(firstDay, lastDay))
    } catch (error) {
        console.log(`Address ${address} Failed`.red)
    }
}

async function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0'); 
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const year = String(date.getFullYear()); 
    return `${year}-${month}-${day}`
}

async function dateDiff(dateStart, dateEnd) {
    let timeDiff = Math.abs(dateEnd.getTime() - dateStart.getTime());
    let diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return diffDays
}

function addRowToCSV(address, balance, nonce, interactedAddress, firstDay, lastDay, dayDiff) {
    const row = `${address},${balance},${nonce},${interactedAddress},${firstDay},${lastDay},${dayDiff}\n`;
    fs.appendFile(filename, row, (err) => {
    });
}



async function main() {
    addRowToCSV('Address', 'Balance', 'TxCount', "Interacted address", "First Day", "Last Day", "Days count")
    let counter = 1
    for (let wallet of wallets){
        process.stdout.clearLine();  
        process.stdout.cursorTo(0); 
        process.stdout.write(`Progress ${counter}/${wallets.length} `);
        await fetchInfo(wallet, [])
        counter ++
    }
}

main()