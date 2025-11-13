import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("GovernanceFeedback", {
    from: deployer,
    args: [],
    log: true,
    skipIfAlreadyDeployed: false,
  });

  console.log(`GovernanceFeedback contract deployed at: ${deployed.address}`);
};

export default func;
func.id = "deploy_governance_feedback";
func.tags = ["GovernanceFeedback"];

