/// Initializes shadow-rs to provide build metadata (git commit hash) at runtime
fn main() -> shadow_rs::SdResult<()> {
    shadow_rs::new()
}
