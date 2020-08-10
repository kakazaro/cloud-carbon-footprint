import { CloudWatch, CostExplorer } from 'aws-sdk'
import { AWS_REGIONS } from './AWSRegions'
import { path } from 'ramda'
import { GetCostAndUsageRequest, GetCostAndUsageResponse } from 'aws-sdk/clients/costexplorer'
import { GetMetricDataInput, GetMetricDataOutput } from 'aws-sdk/clients/cloudwatch'

export class AwsDecorator {
  async getCostAndUsageResponse(
    params: CostExplorer.GetCostAndUsageRequest,
  ): Promise<CostExplorer.GetCostAndUsageResponse[]> {
    const costExplorer = new CostExplorer({
      region: AWS_REGIONS.US_EAST_1, //must be us-east-1 to work
    })

    return [await costExplorer.getCostAndUsage(params).promise()]
  }

  async getMetricDataResponse(params: CloudWatch.GetMetricDataInput): Promise<CloudWatch.GetMetricDataOutput[]> {
    const cloudWatch = new CloudWatch()
    return [await cloudWatch.getMetricData(params).promise()]
  }

  @enablePagination('NextPageToken')
  async getCostAndUsageResponses(params: GetCostAndUsageRequest): Promise<GetCostAndUsageResponse[]> {
    return await this.getCostAndUsageResponse(params)
  }

  @enablePagination('NextToken')
  async getMetricDataResponses(params: GetMetricDataInput): Promise<GetMetricDataOutput[]> {
    return await this.getMetricDataResponse(params)
  }
}

export function enablePagination<RequestType, ResponseType>(nextPageProperty: string) {
  return (target: unknown, propertyKey: string, descriptor?: PropertyDescriptor) => {
    const originalMethod = descriptor.value
    descriptor.value = async function (props: RequestType) {
      const responses: ResponseType[] = []

      let latestResponse: ResponseType
      do {
        const args = [
          {
            ...props,
            [nextPageProperty]: path([responses.length, nextPageProperty], responses),
          },
        ]
        latestResponse = (await originalMethod.apply(this, args))[0]
        responses.push(latestResponse)
      } while (path([nextPageProperty], latestResponse))

      return responses
    }

    return descriptor
  }
}
