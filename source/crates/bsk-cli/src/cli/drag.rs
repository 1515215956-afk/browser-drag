//! Experimental BrowserSkill native pointer drag, through normal cancellable RPC.
use anyhow::Context;
use bsk_protocol::{Method, tools::{DragParams, DragResult, DragTrajectory, DragTrajectoryKind}};
use clap::{Args, ValueEnum};
use crate::cli::{business_rpc, ensure_daemon::ensure_daemon, error::{CliError, Format},
    interaction::split_target, navigate::parse_timeout_ms};

#[derive(Debug, Clone, Copy, ValueEnum)]
pub enum PathKind { Linear, Bezier }

#[derive(Debug, Clone, Args)]
pub struct DragArgs {
    pub target: Option<String>,
    #[arg(long = "ref")]
    pub ref_: Option<String>,
    #[arg(long)]
    pub selector: Option<String>,
    #[arg(long)]
    pub session: String,
    #[arg(long = "tab-id")]
    pub tab_id: Option<i64>,
    #[arg(long, allow_hyphen_values = true)]
    pub delta_x: f64,
    #[arg(long, default_value_t = 0.0, allow_hyphen_values = true)]
    pub delta_y: f64,
    #[arg(long, default_value_t = 600, value_parser = clap::value_parser!(u32).range(50..=5000))]
    pub duration_ms: u32,
    #[arg(long, default_value_t = 24, value_parser = clap::value_parser!(u32).range(1..=120))]
    pub steps: u32,
    #[arg(long, value_enum, default_value_t = PathKind::Linear)]
    pub trajectory: PathKind,
    #[arg(long)]
    pub seed: Option<u32>,
    #[arg(long, default_value_t = 18.0)]
    pub curvature_px: f64,
    #[arg(long, default_value_t = 2.0)]
    pub jitter_px: f64,
    #[arg(long, default_value = "10s", value_parser = parse_timeout_ms)]
    pub timeout: u32,
}

pub fn dispatch(args: DragArgs, format: Format) -> Result<(), CliError> {
    let (ref_, selector) = split_target(args.target, args.ref_, args.selector)?;
    if !(
        args.delta_x.is_finite() && args.delta_y.is_finite()
        && args.delta_x.abs() <= 4000.0 && args.delta_y.abs() <= 4000.0
        && (args.delta_x != 0.0 || args.delta_y != 0.0)
        && args.curvature_px.is_finite() && (0.0..=100.0).contains(&args.curvature_px)
        && args.jitter_px.is_finite() && (0.0..=16.0).contains(&args.jitter_px)
        && args.timeout >= args.duration_ms && args.timeout <= 30000
    ) {
        return Err(CliError::Local(anyhow::anyhow!("invalid drag bounds, geometry or timeout")));
    }
    let params = DragParams { session_id: args.session, ref_, selector, tab_id: args.tab_id,
        delta_x: args.delta_x, delta_y: args.delta_y, duration_ms: Some(args.duration_ms),
        steps: Some(args.steps), timeout_ms: Some(args.timeout),
        trajectory: Some(DragTrajectory {
            kind: match args.trajectory { PathKind::Linear=>DragTrajectoryKind::Linear, PathKind::Bezier=>DragTrajectoryKind::Bezier },
            seed: args.seed, curvature_px: Some(args.curvature_px), jitter_px: Some(args.jitter_px),
        }) };
    let info = ensure_daemon().context("ensure isolated BrowserSkill daemon is running")?;
    let result: DragResult = business_rpc::call(info.sock_path, "drag",
        Method::ToolDrag, Some(params), business_rpc::ipc_timeout(args.timeout))?;
    match format {
        Format::Json => println!("{}", serde_json::to_string_pretty(&result).map_err(anyhow::Error::from)?),
        Format::Human => println!("drag input dispatched tab={} from=({},{}) to=({},{}) released={}",
            result.tab_id, result.from.x,result.from.y,result.to.x,result.to.y,result.released),
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use clap::Parser;
    #[derive(Parser)]
    struct TestCli { #[command(flatten)] args: DragArgs }
    #[test]
    fn accepts_negative_delta_and_replay_seed() {
        let p=TestCli::try_parse_from(["drag","@e1","--session","test","--delta-x","-40",
            "--trajectory","bezier","--seed","123"]).unwrap().args;
        assert_eq!(p.delta_x,-40.0);
        assert_eq!(p.seed,Some(123));
    }
    #[test]
    fn rejects_excessive_step_count() {
        assert!(TestCli::try_parse_from(["drag","@e1","--session","test","--delta-x","40",
            "--steps","121"]).is_err());
    }
}
