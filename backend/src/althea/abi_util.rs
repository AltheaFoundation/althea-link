use clarity::{Address, Uint256};

/// Parses a bool from ABI-encoded `input`, with the relevant data beginning
/// at byte index `start`. Bools are 1 byte long packed on the right side.
pub fn parse_bool(input: &[u8], start: usize) -> bool {
    // if the last byte is 0, it's false, otherwise it's true
    input[start + 31] != 0u8
}

/// Parses an Address from ABI-encoded `input`, with the relevant data beginning
/// at byte index `start`. Addresses are 20 bytes long packed on the right side.
pub fn parse_address(input: &[u8], start: usize) -> Result<Address, clarity::Error> {
    let end = start + 32;
    Address::from_slice(&input[start + 12..end])
}

/// Parses a Uint256 from ABI-encoded `input`, with the relevant data beginning
/// at byte index `start`.
pub fn parse_uint256(input: &[u8], start: usize) -> Uint256 {
    let end = start + 32;
    let data = &input[start..end];
    Uint256::from_be_bytes(data)
}

/// Parses a u64 from ABI-encoded `input`, with the relevant data beginning
/// at byte index `start`. u64's are 8 bytes long and packed on the right side.
pub fn parse_u64(input: &[u8], start: usize) -> u64 {
    let end = start + 32;
    // u128 is smooshed against the right side
    let data = &input[start + 24..end];
    u64::from_be_bytes(data.try_into().unwrap())
}

/// Parses a u128 from ABI-encoded `input`, with the relevant data beginning
/// at byte index `start`. u128's are 16 bytes long and packed on the right side.
pub fn parse_u128(input: &[u8], start: usize) -> u128 {
    let end = start + 32;
    // u128 is smooshed against the right side
    let data = &input[start + 16..end];
    u128::from_be_bytes(data.try_into().unwrap())
}

/// Parses an i32 from ABI-encoded `input`, with the relevant data beginning
/// at byte index `start`. i32's are 8 bytes long and packed on the right side.
pub fn parse_i32(input: &[u8], start: usize) -> i32 {
    let end = start + 32;
    // i32 is smooshed against the right side
    let data = &input[start + 28..end];
    i32::from_be_bytes(data.try_into().unwrap())
}

/// Parses an i128 from ABI-encoded `input`, with the relevant data beginning
/// at byte index `start`. i128's are 16 bytes long and packed on the right side.
pub fn parse_i128(input: &[u8], start: usize) -> i128 {
    let end = start + 32;
    // i128 is smooshed against the right side
    let data = &input[start + 16..end];
    i128::from_be_bytes(data.try_into().unwrap())
}
