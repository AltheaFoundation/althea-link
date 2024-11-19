use std::fmt;

use clarity::error::Error as ClarityError;
use web30::jsonrpc::error::Web3Error;

#[derive(Debug)]
pub enum AltheaError {
    EthereumRestError(Web3Error),
    ClarityError(ClarityError),
    InvalidEventLogError(String),
}
impl fmt::Display for AltheaError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AltheaError::EthereumRestError(val) => write!(f, "Web3 error: {}", val),
            AltheaError::InvalidEventLogError(val) => write!(f, "Invalid ethereum logs: {}", val),
            AltheaError::ClarityError(error) => write!(f, "Clarity error: {}", error),
        }
    }
}
impl From<Web3Error> for AltheaError {
    fn from(error: Web3Error) -> Self {
        AltheaError::EthereumRestError(error)
    }
}
impl From<ClarityError> for AltheaError {
    fn from(error: ClarityError) -> Self {
        AltheaError::ClarityError(error)
    }
}
