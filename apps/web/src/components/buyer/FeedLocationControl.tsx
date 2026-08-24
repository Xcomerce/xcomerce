import { CityMultiSelect } from '@/components/buyer/CityMultiSelect'
import { useFeedCityFilter } from '@/hooks/use-feed-city-filter'

type FeedLocationControlProps = {
  className?: string
  variant?: 'select' | 'link'
}

export function FeedLocationControl({ className, variant = 'select' }: FeedLocationControlProps) {
  const { cities, setCities } = useFeedCityFilter()

  return (
    <CityMultiSelect
      value={cities}
      onChange={setCities}
      className={className}
      variant={variant}
      title="Sua localização"
      description="Selecione uma ou mais cidades para priorizar produtos da região."
    />
  )
}
