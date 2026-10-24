
package com.surya.hospitalmanagement.repository;

import com.surya.hospitalmanagement.entity.Bed;
import com.surya.hospitalmanagement.entity.BedStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BedRepository extends JpaRepository<Bed, Long> {

    // Count beds by status: AVAILABLE, OCCUPIED, or MAINTENANCE
    long countByStatus(BedStatus status);

    boolean existsByBedNumberIgnoreCaseAndIdNot(String trim, Long id);

    boolean existsByBedNumberIgnoreCase(String trim);
}
